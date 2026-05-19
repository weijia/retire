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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { usePlansStore } from '../stores/plans';

import { exportDb, importDb } from '../db';
import { versionDisplay, buildTimeDisplay } from '../version';

const router = useRouter();
const userStore = useUserStore();
const plansStore = usePlansStore();

const saving = ref(false);

const form = ref({
  birthYear: 1990,
  targetRetireAge: 60,
  actualRetireAge: 65,
  gender: 'male' as 'male' | 'female',
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
</script>

<style scoped>
.settings-page {
  padding-top: 0;
}

.data-actions {
  display: flex;
  gap: 12px;
}

.form-hint {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 4px;
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
