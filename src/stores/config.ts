/**
 * 配置管理 Store
 *
 * 使用 zen-fs-config 管理 4 种应用配置：
 * - /user     → 用户配置（出生年份、退休年龄等）
 * - /pension  → 养老金测算配置
 * - /health   → 健康画像
 * - /sync     → 同步设置（替代 gitee_sync_config）
 *
 * 所有配置通过 ConfigRepo 读写，IndexedDB 为主后端，
 * 添加 Gitee 等副本后端后自动双向同步。
 *
 * 业务数据（资产、消费记录、养老金缴存记录等）仍存储在原有 IndexedDB 中。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getConfigRepo } from '../config/configRepo';
import type { IConfigRepo } from 'zen-fs-config';
import type {
  UserConfig,
  PensionConfig,
  HealthProfile,
  GiteeSyncConfig,
} from '../types';
import { getDoc } from '../db';

// 配置路径常量（zen-fs-config 自动加 .json 后缀）
const PATHS = {
  user: '/user',
  pension: '/pension',
  health: '/health',
  sync: '/sync',
} as const;

// 旧 IndexedDB 中的文档 ID（用于一次性迁移）
const OLD_DOC_IDS = {
  user: 'user_config_profile',
  pension: 'pension_config_main',
  health: 'health_profile_main',
  sync: 'gitee_sync_config_main',
} as const;

export const useConfigStore = defineStore('config', () => {
  // ============ State ============
  const userConfig = ref<UserConfig['data'] | null>(null);
  const pensionConfig = ref<PensionConfig['data'] | null>(null);
  const healthProfile = ref<HealthProfile['data'] | null>(null);
  const syncConfig = ref<GiteeSyncConfig['data'] | null>(null);
  const loaded = ref(false);
  const backends = ref<Array<{ id: string; type: string; description?: string }>>([]);

  // ============ 内部辅助 ============
  function getRepo(): IConfigRepo {
    return getConfigRepo();
  }

  /**
   * 从后端拓扑中提取可展示的后端列表
   */
  function extractBackends(result: { backends: Array<{ id: string; type: string; description?: string }> } | null) {
    if (!result || !result.backends) return [];
    return result.backends
      .filter(b => b.id !== 'local-idb') // 过滤掉本地主后端（用户不需要看到）
      .map(b => ({
        id: b.id,
        type: b.type,
        description: (b as any).description,
      }));
  }

  /**
   * 安全读取配置：不存在时返回 undefined 而非抛异常
   * zen-fs-config 的 getConfig() 在缓存中没有 key 时会抛异常
   */
  function safeGetConfig<T>(path: string): T | undefined {
    try {
      return getRepo().getConfig<T>(path);
    } catch {
      return undefined;
    }
  }

  /**
   * 从 zen-fs-config 加载全部配置到内存
   * 包含一次性迁移逻辑：如果 zen-fs-config 中没有配置，从旧 IndexedDB 读取
   */
  async function loadAll() {
    const repo = getRepo();

    // 同步读取（从内存缓存，不存在时返回 undefined）
    let user = safeGetConfig<UserConfig['data']>(PATHS.user);
    let pension = safeGetConfig<PensionConfig['data']>(PATHS.pension);
    let health = safeGetConfig<HealthProfile['data']>(PATHS.health);
    let sync = safeGetConfig<GiteeSyncConfig['data']>(PATHS.sync);

    // ============ 一次性迁移：从旧 IndexedDB 读取 ============
    let migrated = false;

    if (!user) {
      try {
        const oldDoc = await getDoc(OLD_DOC_IDS.user) as UserConfig | undefined;
        if (oldDoc?.data) {
          const d = oldDoc.data as any;
          // 兼容旧数据：补充新增字段的默认值
          if (d.actualRetireAge === undefined) d.actualRetireAge = 65;
          if (d.birthYear === undefined && d.birthDate) {
            d.birthYear = new Date(d.birthDate).getFullYear();
          }
          repo.setConfig(PATHS.user, d);
          user = d;
          migrated = true;
        }
      } catch { /* 旧数据不存在或读取失败，忽略 */ }
    }

    if (!pension) {
      try {
        const oldDoc = await getDoc(OLD_DOC_IDS.pension) as PensionConfig | undefined;
        if (oldDoc?.data) {
          repo.setConfig(PATHS.pension, oldDoc.data);
          pension = oldDoc.data;
          migrated = true;
        }
      } catch { /* 忽略 */ }
    }

    if (!health) {
      try {
        const oldDoc = await getDoc(OLD_DOC_IDS.health) as HealthProfile | undefined;
        if (oldDoc?.data) {
          repo.setConfig(PATHS.health, oldDoc.data);
          health = oldDoc.data;
          migrated = true;
        }
      } catch { /* 忽略 */ }
    }

    if (!sync) {
      try {
        const oldDoc = await getDoc(OLD_DOC_IDS.sync) as GiteeSyncConfig | undefined;
        if (oldDoc?.data) {
          repo.setConfig(PATHS.sync, oldDoc.data);
          sync = oldDoc.data;
          migrated = true;
        }
      } catch { /* 忽略 */ }
    }

    if (migrated) {
      console.log('[ConfigStore] 已从旧存储迁移配置到 zen-fs-config');
      // 触发同步到已连接的副本后端
      try { await repo.flush(); } catch { /* 忽略同步错误 */ }
    }

    // 更新 state
    userConfig.value = user || null;
    pensionConfig.value = pension || null;
    healthProfile.value = health || null;
    syncConfig.value = sync || null;

    // 加载后端拓扑
    try {
      const result = await repo.getBackends();
      backends.value = extractBackends(result as any);
    } catch {
      backends.value = [];
    }

    // 如果已有同步配置但尚未添加 Gitee 后端，自动连接
    if (sync && backends.value.length === 0) {
      const s = sync as GiteeSyncConfig['data'];
      if (s.token && s.owner && s.repo) {
        try {
          await repo.addBackend('gitee', 'Gitee', {
            token: s.token,
            owner: s.owner,
            repo: s.repo,
            branch: s.branch || 'master',
          }, 'Gitee 配置同步');
          await refreshBackends();
          console.log('[ConfigStore] 已自动连接 Gitee 后端');
        } catch (err) {
          console.warn('[ConfigStore] 自动连接 Gitee 后端失败:', err);
        }
      }
    }

    loaded.value = true;
    console.log('[ConfigStore] 配置加载完成');
  }

  // ============ 用户配置 ============
  function getUserConfig(): UserConfig['data'] | null {
    return userConfig.value;
  }

  function setUserConfig(data: UserConfig['data']) {
    const repo = getRepo();
    const plainData = JSON.parse(JSON.stringify(data));
    repo.setConfig(PATHS.user, plainData);
    userConfig.value = plainData;
  }

  // ============ 养老金配置 ============
  function getPensionConfig(): PensionConfig['data'] | null {
    return pensionConfig.value;
  }

  function setPensionConfig(data: PensionConfig['data']) {
    const repo = getRepo();
    const plainData = JSON.parse(JSON.stringify(data));
    repo.setConfig(PATHS.pension, plainData);
    pensionConfig.value = plainData;
  }

  // ============ 健康画像 ============
  function getHealthProfile(): HealthProfile['data'] | null {
    return healthProfile.value;
  }

  function setHealthProfile(data: HealthProfile['data']) {
    const repo = getRepo();
    const plainData = JSON.parse(JSON.stringify(data));
    repo.setConfig(PATHS.health, plainData);
    healthProfile.value = plainData;
  }

  // ============ 同步配置 ============
  function getSyncConfig(): GiteeSyncConfig['data'] | null {
    return syncConfig.value;
  }

  function setSyncConfig(data: GiteeSyncConfig['data']) {
    const repo = getRepo();
    const plainData = JSON.parse(JSON.stringify(data));
    repo.setConfig(PATHS.sync, plainData);
    syncConfig.value = plainData;
  }

  // ============ 后端管理 ============
  /**
   * 添加 Gitee 副本后端
   * 添加后自动建立双向同步
   */
  async function addGiteeBackend(
    id: string,
    options: { token: string; owner: string; repo: string; branch: string },
    description?: string
  ) {
    const repo = getRepo();
    await repo.addBackend(id, 'Gitee', options, description);
    await refreshBackends();
  }

  /**
   * 移除副本后端
   */
  async function removeBackend(id: string) {
    const repo = getRepo();
    await repo.removeBackend(id);
    await refreshBackends();
  }

  /**
   * 刷新后端列表
   */
  async function refreshBackends() {
    const repo = getRepo();
    try {
      const result = await repo.getBackends();
      backends.value = extractBackends(result as any);
    } catch {
      backends.value = [];
    }
  }

  /**
   * 手动触发同步
   */
  async function flush() {
    const repo = getRepo();
    return await repo.flush();
  }

  /**
   * 获取同步状态
   */
  function getSyncStatuses() {
    const repo = getRepo();
    return repo.getSyncStatuses();
  }

  return {
    // state
    userConfig,
    pensionConfig,
    healthProfile,
    syncConfig,
    loaded,
    backends,
    // load
    loadAll,
    // user
    getUserConfig,
    setUserConfig,
    // pension
    getPensionConfig,
    setPensionConfig,
    // health
    getHealthProfile,
    setHealthProfile,
    // sync
    getSyncConfig,
    setSyncConfig,
    // backends
    addGiteeBackend,
    removeBackend,
    refreshBackends,
    flush,
    getSyncStatuses,
  };
});
