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

    <div class="card">
      <div class="card-title">数据管理</div>
      <div class="form-hint" style="margin-bottom: 12px;">
        导出/导入完整数据（含资产、消费记录、养老金记录等所有业务数据）
      </div>
      <div class="data-actions">
        <button class="btn btn-sm" @click="exportData">导出数据</button>
        <label class="btn btn-sm" style="cursor:pointer">
          导入数据
          <input type="file" accept=".json" @change="importData" style="display:none" />
        </label>
      </div>
    </div>

    <!-- 配置云同步（zen-fs-config） -->
    <div class="card">
      <div class="card-title">配置云同步</div>
      <div class="form-hint" style="margin-bottom: 12px;">
        将个人配置（退休设置、养老金参数、健康画像）自动同步到云端，实现多设备配置同步。
        <strong>注意：仅同步配置，不同步业务数据。</strong>
      </div>

      <!-- 已连接的后端列表 -->
      <div v-if="configStore.backends.length > 0" class="backend-list">
        <div v-for="b in configStore.backends" :key="b.id" class="backend-item">
          <div class="backend-info">
            <span class="backend-type">{{ b.type }}</span>
            <span class="backend-desc">{{ b.description || b.id }}</span>
          </div>
          <div class="backend-actions">
            <span class="sync-badge" :class="getSyncBadgeClass(b.id)">
              {{ getSyncBadgeText(b.id) }}
            </span>
            <button class="btn btn-sm btn-danger" @click="disconnectBackend(b.id)" :disabled="syncing">
              断开
            </button>
          </div>
        </div>
      </div>

      <!-- 添加同步后端（动态表单） -->
      <div v-if="configStore.backends.length === 0 && configStore.backendMetadata.length > 0" class="backend-form">
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
            placeholder="用于标识此后端连接，如 gitee-prod"
          />
          <div class="form-hint">自定义一个唯一标识，方便管理多个同步后端</div>
        </div>

        <button class="btn btn-sm btn-primary btn-block" @click="connectBackend" :disabled="syncing || !isBackendFormValid">
          {{ syncing ? '连接中...' : '连接并同步' }}
        </button>
      </div>

      <!-- 无可用后端 -->
      <div v-if="configStore.backends.length === 0 && configStore.backendMetadata.length === 0" class="form-hint">
        暂无可用的同步后端
      </div>

      <!-- 手动同步按钮 -->
      <div v-if="configStore.backends.length > 0" class="data-actions" style="margin-top: 12px;">
        <button class="btn btn-sm" @click="manualSync" :disabled="syncing">
          {{ syncing ? '同步中...' : '立即同步' }}
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
import { exportDb, importDb } from '../db';
import { versionDisplay, buildTimeDisplay } from '../version';
import type { GiteeSyncConfig } from '../types';
import type { BackendParamDef } from 'zen-fs-config';

const router = useRouter();
const userStore = useUserStore();
const plansStore = usePlansStore();
const configStore = useConfigStore();

const saving = ref(false);
const syncing = ref(false);
const syncStatus = ref<{ type: 'success' | 'error'; message: string } | null>(null);

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
    // 自动填充后端标识为类型小写
    if (!backendId.value) {
      backendId.value = meta.type.toLowerCase();
    }
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

// 连接同步后端（通用：基于动态表单数据添加后端）
async function connectBackend() {
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

    // 添加后端，自动建立双向同步
    await configStore.addBackend(
      backendId.value,
      type,
      options,
      `${meta?.label || type} 配置同步`,
    );

    // 保存同步配置到配置仓库（用于下次自动重连）
    const syncData: GiteeSyncConfig['data'] = {
      token: backendFormValues.value.token || '',
      owner: backendFormValues.value.owner || '',
      repo: backendFormValues.value.repo || '',
      branch: backendFormValues.value.branch || 'master',
      filePath: 'retire-config.json',
    };
    configStore.setSyncConfig(syncData);

    syncStatus.value = { type: 'success', message: `已连接 ${meta?.label || type} 并开始同步配置` };
  } catch (e: any) {
    syncStatus.value = { type: 'error', message: `连接失败: ${e.message || e}` };
  } finally {
    syncing.value = false;
  }
}

// 断开 Gitee 后端
async function disconnectBackend(id: string) {
  if (!confirm('断开后将停止配置同步，确定继续吗？')) return;

  syncing.value = true;
  try {
    await configStore.removeBackend(id);
    syncStatus.value = { type: 'success', message: '已断开同步' };
  } catch (e: any) {
    syncStatus.value = { type: 'error', message: `断开失败: ${e.message || e}` };
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

// 获取同步状态徽章
function getSyncBadgeClass(backendId: string): string {
  const statuses = configStore.getSyncStatuses();
  for (const [pairId, status] of statuses) {
    if (pairId.includes(backendId)) {
      if (status.state === 'syncing') return 'sync-badge-syncing';
      if (status.state === 'disposed') return 'sync-badge-error';
      if (status.state === 'paused') return 'sync-badge-unknown';
      return 'sync-badge-ok';
    }
  }
  return 'sync-badge-unknown';
}

function getSyncBadgeText(backendId: string): string {
  const statuses = configStore.getSyncStatuses();
  for (const [pairId, status] of statuses) {
    if (pairId.includes(backendId)) {
      if (status.state === 'syncing') return '同步中';
      if (status.state === 'disposed') return '已断开';
      if (status.state === 'paused') return '已暂停';
      if (status.state === 'watching') return '自动同步';
      return '已同步';
    }
  }
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
  color: var(--danger, #ff4d4f);
  border-color: var(--danger, #ff4d4f);
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
