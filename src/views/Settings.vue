<template>
  <div class="settings-page">
    <div class="page-header">
      <button class="back-btn" @click="$router.back()">‹ 返回</button>
      <h1>设置</h1>
      <span></span>
    </div>

    <div class="card">
      <div class="card-title">个人信息</div>

      <div class="form-group">
        <label class="form-label">性别</label>
        <select v-model="form.gender" class="form-select">
          <option value="male">男</option>
          <option value="female">女</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">出生年份</label>
        <input
          v-model.number="form.birthYear"
          type="number"
          class="form-input"
          min="1940"
          max="2020"
          placeholder="如：1990"
        />
      </div>
      <div class="form-group">
        <label class="form-label">目标退休年龄</label>
        <div class="form-hint">您计划在多少岁不再工作，之后不再有工资收入，靠积蓄和投资生活</div>
        <input
          v-model.number="form.targetRetireAge"
          type="number"
          class="form-input"
          min="40"
          max="70"
        />
      </div>
      <div class="form-group">
        <label class="form-label">实际退休年龄（领退休金）</label>
        <div class="form-hint">您可以正式领取退休金的年龄。从目标退休年龄到该年龄之间为"空窗期"，需靠积蓄生活</div>
        <input
          v-model.number="form.actualRetireAge"
          type="number"
          class="form-input"
          min="50"
          max="75"
        />
      </div>
      <button class="btn btn-primary btn-block" @click="save" :disabled="saving">
        {{ saving ? '保存中...' : '保存设置' }}
      </button>
    </div>

    <!-- 业务数据：本地备份 -->
    <div class="card">
      <div class="card-title">业务数据备份</div>
      <div class="form-hint" style="margin-bottom: 12px;">
        业务数据包括：资产账户、消费记录、养老金缴存记录、健康每日记录、预期寿命快照等。
        <br/>以下为本地导出/导入，适合手动备份和迁移。
      </div>
      <div class="data-actions">
        <button class="btn btn-sm" @click="exportData">导出到文件</button>
        <label class="btn btn-sm" style="cursor:pointer">
          从文件导入
          <input type="file" accept=".json" @change="importData" style="display:none" />
        </label>
      </div>
    </div>

    <!-- 云同步设置（统一入口，不区分配置/数据） -->
    <div class="card">
      <div class="card-title">云同步</div>
      <div class="form-hint" style="margin-bottom: 12px;">
        将配置和数据同步到云端，实现多设备间实时一致。
      </div>

      <!-- 已配置的后端列表 -->
      <div v-if="hasAnyBackend" class="backend-list">
        <div class="list-section-title">已配置的同步后端</div>
        
        <div v-for="b in allBackends" :key="b.id" class="backend-item">
          <div class="backend-info">
            <span class="backend-type">{{ b.type }}</span>
            <span class="backend-desc">{{ b.description || b.id }}</span>
          </div>
          <div class="backend-actions">
            <span v-if="b.syncState" class="sync-badge" :class="getSyncBadgeClass(b.syncState)">
              {{ getSyncBadgeText(b.syncState) }}
            </span>
            <button class="btn btn-sm btn-danger" @click="removeBackend(b)" :disabled="syncing">
              删除
            </button>
          </div>
        </div>

        <!-- 手动同步按钮 -->
        <div class="data-actions" style="margin-top: 12px;">
          <button class="btn btn-sm" @click="manualSync" :disabled="syncing">
            {{ syncing ? '同步中...' : '立即同步' }}
          </button>
        </div>
      </div>

      <!-- 添加新后端 -->
      <div v-if="configStore.backendMetadata.length > 0" class="backend-form" :class="{ 'mt-12': hasAnyBackend }">
        <div class="list-section-title">{{ hasAnyBackend ? '添加更多同步后端' : '添加云同步后端' }}</div>

        <!-- 后端类型选择 -->
        <div v-if="configStore.backendMetadata.length > 1" class="form-group">
          <label class="form-label">后端类型</label>
          <select v-model="selectedBackendType" class="form-select" @change="onBackendTypeChange">
            <option v-for="m in configStore.backendMetadata" :key="m.type" :value="m.type">
              {{ m.icon }} {{ m.label }}
            </option>
          </select>
        </div>

        <!-- 动态字段表单 -->
        <div v-for="field in currentBackendFields" :key="field.key" class="form-group">
          <label class="form-label">
            {{ field.label }}
            <span v-if="field.required" class="required-mark">*</span>
          </label>
          <input
            v-model="backendFormValues[field.key]"
            :type="field.type === 'password' ? 'password' : 'text'"
            class="form-input"
            :placeholder="field.placeholder || ''"
          />
        </div>

        <!-- 后端 ID -->
        <div class="form-group">
          <label class="form-label">后端标识</label>
          <input
            v-model="backendId"
            type="text"
            class="form-input"
            placeholder="如：gitee-sync"
          />
          <div class="form-hint">自定义唯一标识，方便管理</div>
        </div>

        <button class="btn btn-sm btn-primary btn-block" @click="addSyncBackend" :disabled="syncing || !isBackendFormValid">
          {{ syncing ? '连接中...' : '添加并同步' }}
        </button>
      </div>

      <div v-if="syncStatus" class="sync-status" :class="syncStatus.type">
        {{ syncStatus.message }}
      </div>
    </div>

    <!-- 版本信息 -->
    <div class="card version-info">
      <div class="card-title">关于</div>
      <div class="version-detail">
        <div class="version-row">
          <span>版本</span>
          <span>{{ versionDisplay }}</span>
        </div>
        <div class="version-row">
          <span>发布时间</span>
          <span>{{ buildTimeDisplay }}</span>
        </div>
      </div>
    </div>

    <!-- 功能说明入口 -->
    <div class="card help-links">
      <router-link to="/pension/help" class="help-link-item">
        <span>💰 养老金计算说明</span>
        <span>›</span>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { usePlansStore } from '../stores/plans';
import { useConfigStore } from '../stores/config';
import { useDataSyncStore } from '../stores/dataSyncStore';
import { exportDb, importDb } from '../db';
import { versionDisplay, buildTimeDisplay } from '../version';
import type { GiteeSyncConfig } from '../types';
import type { BackendParamDef } from 'zen-fs-config';

const router = useRouter();
const userStore = useUserStore();
const plansStore = usePlansStore();
const configStore = useConfigStore();
const dataSyncStore = useDataSyncStore();

const saving = ref(false);
const syncing = ref(false);
const syncStatus = ref<{ type: 'success' | 'error'; message: string } | null>(null);

// ============ 后端状态计算 ============
const hasConfigBackend = computed(() => configStore.backends.length > 0);
const hasDataBackend = computed(() => dataSyncStore.dataBackends.length > 0);
const hasAnyBackend = computed(() => hasConfigBackend.value || hasDataBackend.value);

// 统一的后端列表（合并配置同步和数据同步）
interface UnifiedBackend {
  id: string;
  type: string;
  description?: string;
  syncState?: string;
  isConfigSync: boolean;
}

const allBackends = computed<UnifiedBackend[]>(() => {
  const result: UnifiedBackend[] = [];
  
  // 添加配置同步后端
  for (const b of configStore.backends) {
    result.push({
      id: b.id,
      type: b.type,
      description: b.description,
      syncState: configStore.getBackendSyncState(b.id),
      isConfigSync: true,
    });
  }
  
  // 添加数据同步后端
  for (const b of dataSyncStore.dataBackends) {
    result.push({
      id: b.id,
      type: b.type,
      description: b.description,
      isConfigSync: false,
    });
  }
  
  return result;
});

const form = ref({
  birthYear: 1990,
  targetRetireAge: 60,
  actualRetireAge: 65,
  gender: 'male' as 'male' | 'female',
});

// ============ 动态后端表单 ============
const selectedBackendType = ref('');
const backendFormValues = ref<Record<string, string>>({});
const backendId = ref('');

/** 当前选中后端类型的字段定义 */
const currentBackendFields = computed<BackendParamDef[]>(() => {
  const meta = configStore.backendMetadata.find(m => m.type === selectedBackendType.value);
  return meta?.fields || [];
});

/** 表单是否填写有效（必填字段都有值） */
const isBackendFormValid = computed(() => {
  if (!backendId.value) return false;
  for (const field of currentBackendFields.value) {
    if (field.required && !backendFormValues.value[field.key]) return false;
  }
  return true;
});

/** 切换后端类型时，用默认值初始化表单 */
function onBackendTypeChange() {
  const meta = configStore.backendMetadata.find(m => m.type === selectedBackendType.value);
  if (meta) {
    backendFormValues.value = { ...meta.defaultOptions };
    // 切换后端类型时重置后端标识为类型小写
    backendId.value = meta.type.toLowerCase();
  }
}

onMounted(async () => {
  await userStore.loadConfig();
  if (userStore.config) {
    const data = userStore.config.data as any;
    form.value = {
      birthYear: data.birthYear ?? (data.birthDate ? new Date(data.birthDate).getFullYear() : 1990),
      targetRetireAge: data.targetRetireAge,
      actualRetireAge: data.actualRetireAge,
      gender: data.gender,
    };
  }

  // 初始化动态后端表单：选中第一个可用后端类型
  if (configStore.backendMetadata.length > 0) {
    selectedBackendType.value = configStore.backendMetadata[0].type;
    onBackendTypeChange();
  }

  // 初始化数据同步 store
  await dataSyncStore.init();
});

async function save() {
  if (!form.value.birthYear) {
    alert('请填写出生年份');
    return;
  }
  saving.value = true;
  try {
    const isFirstConfig = !userStore.config;
    await userStore.saveConfig(form.value);
    userStore.checkConfigured();

    // 首次配置时，自动创建灵活就业社保支出计划
    if (isFirstConfig) {
      await plansStore.loadPlans();
      const hasSocialPension = plansStore.plans.some(
        p => p.data.category === 'social_pension' && p.data.isActive
      );
      if (!hasSocialPension) {
        const year = new Date().getFullYear();
        await plansStore.addPlan({
          name: '灵活就业社保',
          year,
          category: 'social_pension',
          annualAmount: 12000,
          monthlyAmount: 1000,
          frequency: 'monthly',
          description: '灵活就业社保支出（空窗期自行缴纳）',
          isActive: true,
          isFixed: false,
        });
      }
    }

    router.back();
  } finally {
    saving.value = false;
  }
}

async function exportData() {
  try {
    const data = await exportDb();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retire_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('导出失败');
  }
}

async function importData(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!confirm('导入数据将覆盖当前所有数据，确定继续吗？')) {
    return;
  }

  try {
    const text = await file.text();
    await importDb(text);
    alert('导入成功，请刷新页面');
    window.location.reload();
  } catch (e) {
    alert('导入失败，请检查文件格式');
  }
}

// 添加同步后端（默认同时同步配置和数据）
async function addSyncBackend() {
  if (!isBackendFormValid.value) {
    alert('请填写所有必填字段');
    return;
  }

  syncing.value = true;
  syncStatus.value = null;

  try {
    const type = selectedBackendType.value;
    const meta = configStore.backendMetadata.find(m => m.type === type);
    const options: Record<string, unknown> = { ...backendFormValues.value };
    const id = backendId.value;

    // 同时添加配置同步和数据同步
    // 1. 添加配置同步后端
    await configStore.addBackend(
      id,
      type,
      options,
      `${meta?.label || type} 同步`,
    );

    // 仅 Gitee 后端保存旧格式同步配置
    if (type === 'Gitee') {
      const syncData: GiteeSyncConfig['data'] = {
        token: backendFormValues.value.token || '',
        owner: backendFormValues.value.owner || '',
        repo: backendFormValues.value.repo || '',
        branch: backendFormValues.value.branch || 'master',
        filePath: 'retire-config.json',
      };
      configStore.setSyncConfig(syncData);
    }

    // 2. 添加数据同步后端（复用配置同步的账号）
    await dataSyncStore.addBackend(
      `${id}-data`,
      type,
      {
        repo: backendFormValues.value.repo,
        branch: backendFormValues.value.branch || 'master',
      },
      id, // 复用配置同步后端的账号
      `${meta?.label || type} 数据同步`
    );

    syncStatus.value = { type: 'success', message: `已添加 ${meta?.label || type} 云同步` };
  } catch (e: any) {
    syncStatus.value = { type: 'error', message: `添加失败: ${e.message || e}` };
  } finally {
    syncing.value = false;
  }
}

// 删除后端
async function removeBackend(b: UnifiedBackend) {
  if (!confirm('删除后将移除该同步后端，确定继续吗？')) return;

  syncing.value = true;
  try {
    if (b.isConfigSync) {
      // 删除配置同步后端
      await configStore.removeBackend(b.id);
    } else {
      // 删除数据同步后端
      await dataSyncStore.removeBackend(b.id);
    }
    syncStatus.value = { type: 'success', message: '后端已删除' };
  } catch (e: any) {
    syncStatus.value = { type: 'error', message: `删除失败: ${e.message || e}` };
  } finally {
    syncing.value = false;
  }
}

// 手动触发同步
async function manualSync() {
  syncing.value = true;
  syncStatus.value = null;
  try {
    await configStore.flush();
    syncStatus.value = { type: 'success', message: '同步完成' };
  } catch (e: any) {
    syncStatus.value = { type: 'error', message: `同步失败: ${e.message || e}` };
  } finally {
    syncing.value = false;
  }
}

// 获取同步状态徽章样式
function getSyncBadgeClass(state: string): string {
  if (state === 'syncing') return 'sync-badge-syncing';
  if (state === 'disposed') return 'sync-badge-error';
  if (state === 'paused') return 'sync-badge-unknown';
  if (state === 'watching' || state === 'idle') return 'sync-badge-ok';
  return 'sync-badge-unknown';
}

function getSyncBadgeText(state: string): string {
  if (state === 'syncing') return '同步中';
  if (state === 'disposed') return '已断开';
  if (state === 'paused') return '已暂停';
  if (state === 'watching') return '自动同步';
  if (state === 'idle') return '已同步';
  return '未知';
}
</script>

<style scoped>
.settings-page {
  padding-top: 0;
}

.data-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.form-hint {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 4px;
}

.sync-status {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: var(--radius);
  font-size: 13px;
}

.sync-status.success {
  background: rgba(82, 196, 26, 0.1);
  color: var(--success, #52c41a);
}

.sync-status.error {
  background: rgba(255, 77, 79, 0.1);
  color: var(--danger, #ff4d4f);
}

/* 后端列表 */
.backend-list {
  margin-bottom: 12px;
}

/* 列表分区标题 */
.list-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

/* 必填标记 */
.required-mark {
  color: var(--danger, #ff4d4f);
  margin-left: 2px;
}

.backend-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.backend-item:last-child {
  border-bottom: none;
}

.backend-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.backend-type {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.backend-desc {
  font-size: 12px;
  color: var(--text-light);
}

.backend-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sync-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.sync-badge-ok {
  background: rgba(82, 196, 26, 0.15);
  color: var(--success, #52c41a);
}

.sync-badge-syncing {
  background: rgba(24, 144, 255, 0.15);
  color: var(--primary, #1890ff);
}

.sync-badge-error {
  background: rgba(255, 77, 79, 0.15);
  color: var(--danger, #ff4d4f);
}

.sync-badge-unknown {
  background: rgba(150, 150, 150, 0.15);
  color: var(--text-light);
}

.btn-danger {
  background: transparent;
  color: var(--danger, #ff4d4f);
  border: 1px solid var(--danger, #ff4d4f);
}

.btn-danger:active {
  background: rgba(255, 77, 79, 0.1);
}

.mt-12 {
  margin-top: 12px;
}

.version-info {
  margin-top: 16px;
}

.version-detail {
  padding: 8px 0;
}

.version-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.version-row span:last-child {
  color: var(--text-primary);
  font-family: monospace;
}

.help-links {
  padding: 0;
}

.help-link-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  font-size: 14px;
  color: var(--text-primary);
  text-decoration: none;
  border-bottom: 1px solid var(--border);
}

.help-link-item:last-child {
  border-bottom: none;
}

.help-link-item span:last-child {
  color: var(--text-light);
  font-size: 16px;
}
</style>