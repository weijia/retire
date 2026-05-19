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
        <label class="form-label">姓名</label>
        <input
          v-model="form.name"
          class="form-input"
          placeholder="请输入姓名"
        />
      </div>
      <div class="form-group">
        <label class="form-label">性别</label>
        <select v-model="form.gender" class="form-select">
          <option value="male">男</option>
          <option value="female">女</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">出生日期</label>
        <input
          v-model="form.birthDate"
          type="text"
          class="form-input"
          placeholder="如：1990-06-15"
        />
      </div>
      <div class="form-group">
        <label class="form-label">目标退休年龄</label>
        <div class="form-hint">您计划在多少岁停止工作，之后不再有工资收入</div>
        <input
          v-model.number="form.targetRetireAge"
          type="number"
          class="form-input"
          min="50"
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
      <!-- 收入通过工资收入资产管理，此处不再设置 -->
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

import { exportDb, importDb } from '../db';
import { versionDisplay, buildTimeDisplay } from '../version';

const router = useRouter();
const userStore = useUserStore();

const saving = ref(false);

const form = ref({
  name: '',
  birthDate: '',
  targetRetireAge: 60,
  actualRetireAge: 65,
  gender: 'male' as 'male' | 'female',
  // 收入通过工资收入资产管理
});

onMounted(async () => {
  await userStore.loadConfig();
  if (userStore.config) {
    form.value = { ...userStore.config.data };
  }
});

async function save() {
  if (!form.value.birthDate) {
    alert('请填写出生日期');
    return;
  }
  saving.value = true;
  try {
    // 保存配置
    await userStore.saveConfig(form.value);
    userStore.checkConfigured();
    

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
