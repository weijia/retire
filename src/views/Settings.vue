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
      <div class="data-actions">
        <button class="btn btn-sm" @click="exportData">导出数据</button>
        <label class="btn btn-sm" style="cursor:pointer">
          导入数据
          <input type="file" accept=".json" @change="importData" style="display:none" />
        </label>
      </div>
    </div>

    <!-- Gitee 云同步 -->
    <div class="card">
      <div class="card-title">Gitee 云同步</div>
      <div class="form-hint" style="margin-bottom: 12px;">
        将配置保存到 Gitee 仓库，实现多设备同步。需先在 Gitee 创建私人令牌。
      </div>
      
      <div class="form-group">
        <label class="form-label">访问令牌</label>
        <input
          v-model="giteeConfig.token"
          type="password"
          class="form-input"
          placeholder="Gitee 私人令牌"
        />
        <div class="form-hint">在 Gitee 设置 → 安全设置 → 私人令牌 中创建</div>
      </div>
      
      <div class="form-group">
        <label class="form-label">用户名</label>
        <input
          v-model="giteeConfig.owner"
          type="text"
          class="form-input"
          placeholder="Gitee 用户名"
        />
      </div>
      
      <div class="form-group">
        <label class="form-label">仓库名</label>
        <input
          v-model="giteeConfig.repo"
          type="text"
          class="form-input"
          placeholder="仓库名称"
        />
        <div class="form-hint">需要是一个已存在的仓库</div>
      </div>
      
      <div class="form-group">
        <label class="form-label">分支名</label>
        <input
          v-model="giteeConfig.branch"
          type="text"
          class="form-input"
          placeholder="默认 master"
        />
      </div>
      
      <div class="form-group">
        <label class="form-label">文件路径</label>
        <input
          v-model="giteeConfig.filePath"
          type="text"
          class="form-input"
          placeholder="默认 retire-config.json"
        />
      </div>
      
      <div class="data-actions">
        <button class="btn btn-sm" @click="saveGiteeConfig" :disabled="syncing">
          保存配置
        </button>
        <button class="btn btn-sm btn-primary" @click="syncToGitee" :disabled="syncing || !isGiteeConfigured">
          {{ syncing ? '同步中...' : '上传到 Gitee' }}
        </button>
        <button class="btn btn-sm" @click="syncFromGitee" :disabled="syncing || !isGiteeConfigured">
          从 Gitee 加载
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { usePlansStore } from '../stores/plans';
import { exportDb, importDb } from '../db';
import { versionDisplay, buildTimeDisplay } from '../version';
import { loadFromGitee, saveToGitee, type GiteeConfig } from '../utils/giteeSync';

const router = useRouter();
const userStore = useUserStore();
const plansStore = usePlansStore();

const saving = ref(false);
const syncing = ref(false);
const syncStatus = ref<{ type: 'success' | 'error'; message: string } | null>(null);

const form = ref({
  birthYear: 1990,
  targetRetireAge: 60,
  actualRetireAge: 65,
  gender: 'male' as 'male' | 'female',
});

const giteeConfig = ref({
  token: '',
  owner: '',
  repo: '',
  branch: 'master',
  filePath: 'retire-config.json',
});

const GITEE_CONFIG_KEY = 'gitee_sync_config';

const isGiteeConfigured = computed(() => {
  return giteeConfig.value.token && giteeConfig.value.owner && giteeConfig.value.repo;
});

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
  
  // 加载 Gitee 配置
  const savedGiteeConfig = localStorage.getItem(GITEE_CONFIG_KEY);
  if (savedGiteeConfig) {
    try {
      giteeConfig.value = { ...giteeConfig.value, ...JSON.parse(savedGiteeConfig) };
    } catch (e) {}
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

// 保存 Gitee 配置到 localStorage
function saveGiteeConfig() {
  localStorage.setItem(GITEE_CONFIG_KEY, JSON.stringify(giteeConfig.value));
  syncStatus.value = { type: 'success', message: 'Gitee 配置已保存' };
  setTimeout(() => { syncStatus.value = null; }, 3000);
}

// 上传到 Gitee
async function syncToGitee() {
  if (!isGiteeConfigured.value) {
    alert('请先填写 Gitee 配置');
    return;
  }
  
  syncing.value = true;
  syncStatus.value = null;
  
  try {
    const data = await exportDb();
    const config: GiteeConfig = {
      token: giteeConfig.value.token,
      owner: giteeConfig.value.owner,
      repo: giteeConfig.value.repo,
      branch: giteeConfig.value.branch || 'master',
      filePath: giteeConfig.value.filePath || 'retire-config.json',
    };
    
    // 先尝试获取现有文件
    const existing = await loadFromGitee(config);
    await saveToGitee(config, data, existing?.sha);
    
    syncStatus.value = { type: 'success', message: '已成功上传到 Gitee' };
  } catch (e: any) {
    syncStatus.value = { type: 'error', message: `上传失败: ${e.message}` };
  } finally {
    syncing.value = false;
    setTimeout(() => { syncStatus.value = null; }, 5000);
  }
}

// 从 Gitee 加载
async function syncFromGitee() {
  if (!isGiteeConfigured.value) {
    alert('请先填写 Gitee 配置');
    return;
  }
  
  if (!confirm('从 Gitee 加载将覆盖当前所有数据，确定继续吗？')) {
    return;
  }
  
  syncing.value = true;
  syncStatus.value = null;
  
  try {
    const config: GiteeConfig = {
      token: giteeConfig.value.token,
      owner: giteeConfig.value.owner,
      repo: giteeConfig.value.repo,
      branch: giteeConfig.value.branch || 'master',
      filePath: giteeConfig.value.filePath || 'retire-config.json',
    };
    
    const result = await loadFromGitee(config);
    if (!result) {
      syncStatus.value = { type: 'error', message: 'Gitee 上暂无配置文件' };
      return;
    }
    
    await importDb(result.content);
    syncStatus.value = { type: 'success', message: '已成功从 Gitee 加载，即将刷新页面...' };
    
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (e: any) {
    syncStatus.value = { type: 'error', message: `加载失败: ${e.message}` };
  } finally {
    syncing.value = false;
  }
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
</style>
