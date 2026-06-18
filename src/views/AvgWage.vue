<template>
  <div class="page">
    <div class="page-header">
      <button class="back-btn" @click="$router.back()">‹</button>
      <h1 class="page-title">社平工资管理</h1>
    </div>

    <!-- 当前数据概览 -->
    <div v-if="avgWageStore.dataset.value" class="card">
      <div class="card-header">
        <span class="card-title">{{ avgWageStore.city.value }} 历年社平工资</span>
        <span class="card-link" @click="showImport = true">重新导入</span>
      </div>
      <div class="wage-summary">
        <div class="summary-item">
          <span class="summary-label">数据年份</span>
          <span class="summary-value">{{ yearRange }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">记录条数</span>
          <span class="summary-value">{{ avgWageStore.years.value.length }} 年</span>
        </div>
      </div>
      <div class="wage-list">
        <div v-for="y in avgWageStore.years.value" :key="y.year" class="wage-row">
          <span class="wage-year">{{ y.year }}</span>
          <span class="wage-amount">{{ formatMoney(y.monthlyAvgWage) }}/月</span>
          <span class="wage-source">{{ y.source || '' }}</span>
        </div>
      </div>
      <button class="btn btn-danger" @click="handleDelete">删除数据</button>
    </div>

    <!-- 无数据状态 -->
    <div v-else class="card empty-state">
      <div class="empty-icon">📊</div>
      <div class="empty-title">暂无社平工资数据</div>
      <div class="empty-desc">
        导入本地历年社平工资数据，用于精确计算养老金缴费指数
      </div>
      <button class="btn btn-primary" @click="showImport = true">导入数据</button>
    </div>

    <!-- 导入弹窗 -->
    <div v-if="showImport" class="modal-overlay" @click.self="showImport = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>导入社平工资数据</h3>
          <button class="close-btn" @click="showImport = false">×</button>
        </div>

        <!-- AI 提示词 -->
        <div class="prompt-section">
          <div class="prompt-header">
            <span>🤖 让 AI 生成数据</span>
            <button class="btn-copy" @click="copyPrompt">{{ copyStatus }}</button>
          </div>
          <div class="prompt-box">
            <pre>{{ promptText }}</pre>
          </div>
          <div class="prompt-tip">
            复制上方提示词，发送给 ChatGPT/Claude 等 AI，让它生成 JSON 数据
          </div>
        </div>

        <div class="divider">或直接粘贴 JSON</div>

        <!-- JSON 输入 -->
        <textarea
          v-model="jsonInput"
          class="json-input"
          placeholder="粘贴 AI 生成的 JSON 数据..."
          rows="8"
        />

        <div v-if="importError" class="error-msg">{{ importError }}</div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showImport = false">取消</button>
          <button class="btn btn-primary" :disabled="!jsonInput.trim()" @click="handleImport">
            导入
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAvgWageStore } from '../stores/avgWage';
import { parseAvgWageJson, generateAvgWagePrompt } from '../utils/avgWageImport';
import { formatMoney } from '../utils/format';

const avgWageStore = useAvgWageStore();

const showImport = ref(false);
const jsonInput = ref('');
const importError = ref('');
const copyStatus = ref('复制提示词');

const promptText = generateAvgWagePrompt();

const yearRange = computed(() => {
  const years = avgWageStore.years.value;
  if (years.length === 0) return '';
  return `${years[0].year} - ${years[years.length - 1].year}`;
});

onMounted(() => {
  avgWageStore.loadDataset();
});

const copyPrompt = async () => {
  try {
    await navigator.clipboard.writeText(promptText);
    copyStatus.value = '已复制!';
    setTimeout(() => { copyStatus.value = '复制提示词'; }, 2000);
  } catch {
    copyStatus.value = '复制失败';
  }
};

const handleImport = async () => {
  importError.value = '';
  const result = parseAvgWageJson(jsonInput.value.trim());

  if (!result.success) {
    importError.value = result.errors.join('; ');
    return;
  }

  await avgWageStore.saveDataset(result.data!);
  showImport.value = false;
  jsonInput.value = '';
};

const handleDelete = async () => {
  if (confirm('确定要删除社平工资数据吗？')) {
    await avgWageStore.removeDataset();
  }
};
</script>

<style scoped>
.page {
  padding: 16px;
  padding-bottom: 80px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.back-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #333;
  cursor: pointer;
  padding: 4px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
}

.card-link {
  font-size: 14px;
  color: #4A90D9;
  cursor: pointer;
}

.wage-summary {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.summary-item {
  display: flex;
  flex-direction: column;
}

.summary-label {
  font-size: 12px;
  color: #999;
}

.summary-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.wage-list {
  max-height: 300px;
  overflow-y: auto;
}

.wage-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}

.wage-year {
  font-weight: 500;
  width: 60px;
}

.wage-amount {
  color: #4A90D9;
  font-weight: 500;
}

.wage-source {
  font-size: 12px;
  color: #999;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: #999;
  margin-bottom: 20px;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #4A90D9;
  color: #fff;
}

.btn-secondary {
  background: #f0f0f0;
  color: #666;
}

.btn-danger {
  background: #FF4D4F;
  color: #fff;
  margin-top: 12px;
  width: 100%;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 20px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.prompt-section {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.btn-copy {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #4A90D9;
  background: #fff;
  color: #4A90D9;
  font-size: 13px;
  cursor: pointer;
}

.prompt-box {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.prompt-box pre {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.prompt-tip {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.divider {
  text-align: center;
  color: #999;
  font-size: 14px;
  margin: 16px 0;
  position: relative;
}

.divider::before,
.divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 30%;
  height: 1px;
  background: #e8e8e8;
}

.divider::before { left: 0; }
.divider::after { right: 0; }

.json-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 13px;
  font-family: monospace;
  resize: vertical;
  box-sizing: border-box;
}

.error-msg {
  color: #FF4D4F;
  font-size: 13px;
  margin-top: 8px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.modal-actions .btn {
  flex: 1;
}
</style>
