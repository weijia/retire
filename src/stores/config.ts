/**
 * 配置管理 Store
 *
 * 【新架构】用户的业务配置（user / pension / health / sync / data-sync）
 * 不再存 Config Repo 的 repo.setConfig()，而是集中存到独立的数据同步组
 * 'retire-settings' 的 /config.json（见 config/settingsGroup.ts）。
 * 这样配置与业务数据一样，由 zen-fs-config-ui 的 data-sync 组统一同步。
 *
 * Config Repo 本身仍有价值：保存后端拓扑（.meta/backends）与数据组登记，
 * 且由 App.vue 常驻的 <sync-group-configurator> 建立唯一 repo 并发布到 repoBoard。
 *
 * 业务数据（资产、消费记录、养老金缴存记录等）仍存储在 retire-data 数据组。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getConfigRepo, getRegisteredBackendMetadata } from '../config/configRepo';
import { tryGetConfigRepo } from '../config/configRepo';
import {
  initSettingsGroup,
  readSettingsDocument,
  writeSetting,
  type SettingsDocument,
} from '../config/settingsGroup';
import type { IConfigRepo, BackendMetadata } from 'zen-fs-config';
import type {
  UserConfig,
  PensionConfig,
  HealthProfile,
  GiteeSyncConfig,
} from '../types';
import type { DataSyncConfig } from '../utils/dataSync';
import { getDoc } from '../db';
import { createLogger } from '@richard432/localstorage-logger';
const log = createLogger('retire:config-store');

/** 配置项在 /config.json 中的键 */
const KEYS = {
  user: 'user',
  pension: 'pension',
  health: 'health',
  sync: 'sync',
  dataSync: 'dataSync',
} as const;

// 旧 IndexedDB 中的文档 ID（用于兜底迁移）
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
  const dataSyncConfig = ref<DataSyncConfig | null>(null);
  const loaded = ref(false);
  const backends = ref<Array<{ id: string; type: string; description?: string }>>([]);
  const backendMetadata = ref<BackendMetadata[]>([]);

  // ============ 内部辅助 ============
  function getRepo(): IConfigRepo {
    return getConfigRepo();
  }

  function extractBackends(result: { backends: Array<{ id: string; type: string; description?: string }> } | null) {
    if (!result || !result.backends) return [];
    return result.backends
      .filter(b => b.id !== 'local-idb')
      .map(b => ({ id: b.id, type: b.type, description: (b as any).description }));
  }

  /** 从老 config repo 读取（迁移窗口兜底）；不存在返回 undefined */
  function safeGetLegacy<T>(path: string): T | undefined {
    const repo = tryGetConfigRepo();
    if (!repo) return undefined;
    try {
      return repo.getConfig<T>(path);
    } catch {
      return undefined;
    }
  }

  /**
   * 加载全部配置到内存。
   * 数据源优先级：数据组 /config.json > 老 config repo > 老 IndexedDB 文档。
   */
  async function loadAll() {
    log.log('调用 loadAll()（数据源：settings 数据组）');

    // 1) 确保数据同步组存在（repo 必须已就绪）
    await initSettingsGroup();
    const doc: SettingsDocument = await readSettingsDocument();

    let user = doc[KEYS.user] as UserConfig['data'] | undefined;
    let pension = doc[KEYS.pension] as PensionConfig['data'] | undefined;
    let health = doc[KEYS.health] as HealthProfile['data'] | undefined;
    let sync = doc[KEYS.sync] as GiteeSyncConfig['data'] | undefined;
    let dataSync = doc[KEYS.dataSync] as DataSyncConfig | undefined;

    // 2) 兜底：数据组缺项时尝试老 config repo（首次升级/迁移未完成）
    if (!user) user = safeGetLegacy<UserConfig['data']>('/user');
    if (!pension) pension = safeGetLegacy<PensionConfig['data']>('/pension');
    if (!health) health = safeGetLegacy<HealthProfile['data']>('/health');
    if (!sync) sync = safeGetLegacy<GiteeSyncConfig['data']>('/sync');
    if (!dataSync) dataSync = safeGetLegacy<DataSyncConfig>('/data-sync');

    // 3) 再兜底：老 IndexedDB 文档
    let migrated = false;
    if (!user) {
      try {
        const oldDoc = await getDoc(OLD_DOC_IDS.user) as UserConfig | undefined;
        if (oldDoc?.data) {
          const d = oldDoc.data as any;
          if (d.actualRetireAge === undefined) d.actualRetireAge = 65;
          if (d.birthYear === undefined && d.birthDate) {
            d.birthYear = new Date(d.birthDate).getFullYear();
          }
          user = d; migrated = true;
        }
      } catch { /* ignore */ }
    }
    if (!pension) {
      try {
        const oldDoc = await getDoc(OLD_DOC_IDS.pension) as PensionConfig | undefined;
        if (oldDoc?.data) { pension = oldDoc.data; migrated = true; }
      } catch { /* ignore */ }
    }
    if (!health) {
      try {
        const oldDoc = await getDoc(OLD_DOC_IDS.health) as HealthProfile | undefined;
        if (oldDoc?.data) { health = oldDoc.data; migrated = true; }
      } catch { /* ignore */ }
    }
    if (!sync) {
      try {
        const oldDoc = await getDoc(OLD_DOC_IDS.sync) as GiteeSyncConfig | undefined;
        if (oldDoc?.data) { sync = oldDoc.data; migrated = true; }
      } catch { /* ignore */ }
    }
    if (!dataSync && sync) {
      const s = sync as GiteeSyncConfig['data'];
      if (s.token && s.owner && s.repo) {
        dataSync = {
          backends: [{
            id: 'gitee-data',
            type: 'Gitee',
            options: {
              token: s.token, owner: s.owner, repo: s.repo, branch: s.branch || 'master',
            },
          }],
        };
        migrated = true;
      }
    }

    // 4) 把兜底得到的值一次性写回数据组（之后以数据组为准）
    const toWrite: Partial<SettingsDocument> = {};
    if (doc[KEYS.user] === undefined && user) toWrite[KEYS.user] = user;
    if (doc[KEYS.pension] === undefined && pension) toWrite[KEYS.pension] = pension;
    if (doc[KEYS.health] === undefined && health) toWrite[KEYS.health] = health;
    if (doc[KEYS.sync] === undefined && sync) toWrite[KEYS.sync] = sync;
    if (doc[KEYS.dataSync] === undefined && dataSync) toWrite[KEYS.dataSync] = dataSync;
    for (const [key, value] of Object.entries(toWrite)) {
      await writeSetting(key as keyof SettingsDocument, value);
    }

    userConfig.value = user || null;
    pensionConfig.value = pension || null;
    healthProfile.value = health || null;
    syncConfig.value = sync || null;
    dataSyncConfig.value = dataSync || null;

    // 后端拓扑（来自 repo 的 .meta/backends，仍由 UI 管理）
    try {
      const result = await getRepo().getBackends();
      backends.value = extractBackends(result as any);
    } catch {
      backends.value = [];
    }

    backendMetadata.value = getRegisteredBackendMetadata();
    loaded.value = true;
    log.log('配置加载完成（来源：数据组 + 兜底迁移=' + migrated + '）');
  }

  // ============ 用户配置 ============
  function getUserConfig(): UserConfig['data'] | null {
    return userConfig.value;
  }

  async function setUserConfig(data: UserConfig['data']) {
    const plainData = JSON.parse(JSON.stringify(data));
    await writeSetting(KEYS.user, plainData);
    userConfig.value = plainData;
  }

  // ============ 养老金配置 ============
  function getPensionConfig(): PensionConfig['data'] | null {
    return pensionConfig.value;
  }

  async function setPensionConfig(data: PensionConfig['data']) {
    const plainData = JSON.parse(JSON.stringify(data));
    await writeSetting(KEYS.pension, plainData);
    pensionConfig.value = plainData;
  }

  // ============ 健康画像 ============
  function getHealthProfile(): HealthProfile['data'] | null {
    return healthProfile.value;
  }

  async function setHealthProfile(data: HealthProfile['data']) {
    const plainData = JSON.parse(JSON.stringify(data));
    await writeSetting(KEYS.health, plainData);
    healthProfile.value = plainData;
  }

  // ============ 同步配置（历史兼容，仍写入数据组）============
  function getSyncConfig(): GiteeSyncConfig['data'] | null {
    return syncConfig.value;
  }

  async function setSyncConfig(data: GiteeSyncConfig['data']) {
    const plainData = JSON.parse(JSON.stringify(data));
    await writeSetting(KEYS.sync, plainData);
    syncConfig.value = plainData;
  }

  function getDataSyncConfig(): DataSyncConfig | null {
    return dataSyncConfig.value;
  }

  async function setDataSyncConfig(data: DataSyncConfig) {
    const plainData = JSON.parse(JSON.stringify(data));
    await writeSetting(KEYS.dataSync, plainData);
    dataSyncConfig.value = plainData;
  }

  // ============ 后端管理（UI 管理的兼容接口）============
  async function addGiteeBackend(
    id: string,
    options: { token: string; owner: string; repo: string; branch: string },
    description?: string
  ) {
    await getRepo().addBackend(id, 'Gitee', options, description);
    await refreshBackends();
  }

  async function addBackend(id: string, type: string, options: Record<string, unknown>, description?: string) {
    await getRepo().addBackend(id, type, options, description);
    await refreshBackends();
  }

  async function removeBackend(id: string) {
    await getRepo().removeBackend(id);
    await refreshBackends();
  }

  function pauseBackend(id: string) {
    const repo = getRepo() as any;
    const replica = repo.replicaBackends?.get(id);
    if (!replica) throw new Error(`后端 "${id}" 不存在`);
    repo.syncEngine?.unwatch(replica.pairId);
    log.log(`后端 ${id} 同步已暂停`);
  }

  function resumeBackend(id: string) {
    const repo = getRepo() as any;
    const replica = repo.replicaBackends?.get(id);
    if (!replica) throw new Error(`后端 "${id}" 不存在`);
    repo.syncEngine?.watch(replica.pairId);
    log.log(`后端 ${id} 同步已恢复`);
  }

  function isBackendPaused(id: string): boolean {
    return getBackendSyncState(id) === 'paused';
  }

  function getBackendSyncState(id: string): string | undefined {
    const repo = getRepo() as any;
    const replica = repo.replicaBackends?.get(id);
    if (!replica) return undefined;
    const status = repo.getSyncStatuses().get(replica.pairId);
    return status?.state;
  }

  async function refreshBackends() {
    try {
      const result = await getRepo().getBackends();
      backends.value = extractBackends(result as any);
    } catch {
      backends.value = [];
    }
  }

  async function flush() {
    return await getRepo().flush();
  }

  function getSyncStatuses() {
    return getRepo().getSyncStatuses();
  }

  return {
    userConfig, pensionConfig, healthProfile, syncConfig, dataSyncConfig,
    loaded, backends, backendMetadata,
    loadAll,
    getUserConfig, setUserConfig,
    getPensionConfig, setPensionConfig,
    getHealthProfile, setHealthProfile,
    getSyncConfig, setSyncConfig,
    getDataSyncConfig, setDataSyncConfig,
    addGiteeBackend, addBackend, removeBackend,
    pauseBackend, resumeBackend, isBackendPaused, getBackendSyncState,
    refreshBackends, flush, getSyncStatuses,
  };
});
