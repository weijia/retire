<template>
  <div class="expense-form-page">
    <div class="page-header">
      <button class="back-btn" @click="$router.back()">‹ 返回</button>
      <h1>{{ isEdit ? '编辑消费' : '记录消费' }}</h1>
      <span></span>
    </div>

    <!-- 模式切换（仅新增时显示） -->
    <div v-if="!isEdit" class="mode-tabs">
      <button
        class="mode-tab"
        :class="{ active: mode === 'manual' }"
        @click="mode = 'manual'"
      >手动录入</button>
      <button
        class="mode-tab"
        :class="{ active: mode === 'json' }"
        @click="mode = 'json'"
      >JSON 导入</button>
    </div>

    <!-- ========== 手动录入模式 ========== -->
    <div v-if="mode === 'manual'" class="card">
      <div class="form-group">
        <label class="form-label">消费金额（元）*</label>
        <input v-model.number="form.amount" type="number" class="form-input amount-input" placeholder="0.00" step="0.01" />
      </div>

      <div class="form-group">
        <label class="form-label">消费日期 *</label>
        <input v-model="form.date" type="date" class="form-input" />
      </div>

      <div class="form-group">
        <label class="form-label">消费类别 *</label>
        <select v-model="form.category" class="form-select">
          <option value="">请选择</option>
          <optgroup label="计划类支出">
            <option v-for="(label, key) in planCategories" :key="key" :value="key">
              {{ label }}
            </option>
          </optgroup>
          <optgroup label="日常支出">
            <option v-for="(label, key) in dailyCategories" :key="key" :value="key">
              {{ label }}
            </option>
          </optgroup>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">消费描述 *</label>
        <input v-model="form.description" class="form-input" placeholder="如：午餐、地铁充值" />
      </div>

      <div class="form-group">
        <label class="form-label">支付方式</label>
        <select v-model="form.paymentMethod" class="form-select">
          <option value="">请选择</option>
          <option v-for="account in assetsStore.visibleAccounts" :key="account._id" :value="account.data.name">
            {{ account.data.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">关联消费计划</label>
        <select v-model="form.linkedPlanId" class="form-select">
          <option value="">无关联</option>
          <option v-for="plan in plansStore.currentYearPlans" :key="plan._id" :value="plan._id">
            {{ plan.data.name }} ({{ formatMoney(plan.data.monthlyAmount) }}/月)
          </option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">标签（逗号分隔）</label>
        <input v-model="tagsStr" class="form-input" placeholder="如：工作餐,外卖" />
      </div>

      <div class="form-actions">
        <button v-if="isEdit" class="btn btn-danger" @click="handleDelete">删除</button>
        <button class="btn btn-primary" @click="handleSave" :disabled="saving">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>

    <!-- ========== JSON 导入模式 ========== -->
    <div v-if="mode === 'json'" class="card">
      <!-- AI 提示词模板 -->
      <div class="json-section">
        <div class="section-header">
          <span class="section-title">AI 提示词模板</span>
          <span class="section-desc">复制以下提示词发给 AI（如 ChatGPT、通义千问等），配合消费小票/订单截图生成 JSON</span>
        </div>
        <div class="template-tabs">
          <button
            class="template-tab"
            :class="{ active: activeTemplate === 'standard' }"
            @click="activeTemplate = 'standard'"
          >标准模板</button>
          <button
            class="template-tab"
            :class="{ active: activeTemplate === 'simple' }"
            @click="activeTemplate = 'simple'"
          >简洁模板</button>
        </div>
        <div class="template-box">
          <pre class="template-text">{{ aiPrompts[activeTemplate] }}</pre>
          <button class="btn btn-sm btn-copy" @click="copyPrompt">
            {{ copied ? '已复制' : '复制提示词' }}
          </button>
        </div>
      </div>

      <!-- JSON 输入区 -->
      <div class="json-section">
        <div class="section-header">
          <span class="section-title">粘贴 JSON 数据</span>
          <span class="section-desc">支持单条或多条记录，格式见上方模板</span>
        </div>
        <textarea
          v-model="jsonInput"
          class="json-textarea"
          placeholder='粘贴 AI 生成的 JSON，例如：
{
  "records": [
    {
      "date": "2026-06-19",
      "amount": 85.30,
      "category": "日常购物",
      "description": "超市采购",
      "items": [
        { "name": "牛奶", "unitPrice": 12.5, "quantity": 2, "subtotal": 25.0 }
      ]
    }
  ]
}'
          rows="10"
        ></textarea>
        <button
          class="btn btn-primary btn-block"
          @click="parseJson"
          :disabled="!jsonInput.trim()"
        >
          解析 JSON
        </button>
      </div>

      <!-- 解析错误 -->
      <div v-if="importResult && importResult.errors.length > 0" class="json-errors">
        <div class="error-title">解析错误（{{ importResult.errors.length }}）</div>
        <div v-for="(err, i) in importResult.errors" :key="i" class="error-item">
          {{ err.field }}: {{ err.message }}
        </div>
      </div>

      <!-- 警告 -->
      <div v-if="importResult && importResult.warnings.length > 0" class="json-warnings">
        <div v-for="(w, i) in importResult.warnings" :key="i" class="warning-item">
          ⚠️ {{ w }}
        </div>
      </div>

      <!-- 解析预览 -->
      <div v-if="importResult && importResult.success && importResult.records.length > 0" class="json-section">
        <div class="section-header">
          <span class="section-title">预览（{{ importResult.records.length }} 条记录）</span>
        </div>
        <div class="preview-list">
          <div v-for="r in importResult.records" :key="r._id" class="preview-record">
            <div class="preview-head">
              <span class="preview-date">{{ r.data.date }}</span>
              <span class="preview-amount">{{ formatMoney(r.data.amount) }}</span>
              <span class="preview-cat">{{ getCategoryLabel(r.data.category) }}</span>
            </div>
            <div class="preview-desc">{{ r.data.description }}</div>
            <div v-if="r.data.items && r.data.items.length > 0" class="preview-items">
              <div v-for="(item, j) in r.data.items" :key="j" class="preview-item">
                <span>{{ item.name }}</span>
                <span>{{ formatMoney(item.unitPrice) }}/{{ item.unit || '个' }} × {{ item.quantity }}</span>
                <span>= {{ formatMoney(item.subtotal) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="preview-actions">
          <button class="btn btn-primary btn-block" @click="batchImport" :disabled="importing">
            {{ importing ? '导入中...' : `确认导入 ${importResult.records.length} 条记录` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useExpensesStore } from '../stores/expenses';
import { useAssetsStore } from '../stores/assets';
import { usePlansStore } from '../stores/plans';
import { ExpenseRecordCategoryLabels, type ExpenseRecordCategory } from '../types';
import { formatMoney } from '../utils/format';
import { parseExpenseJson, getAiPromptTemplates, type ImportResult } from '../utils/expenseImport';

const route = useRoute();
const router = useRouter();
const expensesStore = useExpensesStore();
const assetsStore = useAssetsStore();
const plansStore = usePlansStore();
const saving = ref(false);
const tagsStr = ref('');

const isEdit = computed(() => !!route.params.id);

// 模式切换
const mode = ref<'manual' | 'json'>('manual');

// JSON 导入相关
const jsonInput = ref('');
const importResult = ref<ImportResult | null>(null);
const importing = ref(false);
const activeTemplate = ref<'standard' | 'simple'>('standard');
const copied = ref(false);

const aiPrompts = getAiPromptTemplates();

// 分离计划类和日常类
const planCategories: Partial<typeof ExpenseRecordCategoryLabels> = {
  supplementary_medical: ExpenseRecordCategoryLabels.supplementary_medical,
  social_pension: ExpenseRecordCategoryLabels.social_pension,
  medical_insurance: ExpenseRecordCategoryLabels.medical_insurance,
  family_fixed: ExpenseRecordCategoryLabels.family_fixed,
  personal_fixed: ExpenseRecordCategoryLabels.personal_fixed,
  personal_flexible: ExpenseRecordCategoryLabels.personal_flexible,
};

const dailyCategories: Partial<typeof ExpenseRecordCategoryLabels> = {
  daily_food: ExpenseRecordCategoryLabels.daily_food,
  daily_transport: ExpenseRecordCategoryLabels.daily_transport,
  daily_shopping: ExpenseRecordCategoryLabels.daily_shopping,
  daily_entertainment: ExpenseRecordCategoryLabels.daily_entertainment,
  daily_housing: ExpenseRecordCategoryLabels.daily_housing,
  daily_other: ExpenseRecordCategoryLabels.daily_other,
};

const form = ref({
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  category: '' as ExpenseRecordCategory | '',
  description: '',
  paymentMethod: '',
  linkedPlanId: '',
});

function getCategoryLabel(cat: ExpenseRecordCategory): string {
  return ExpenseRecordCategoryLabels[cat] || cat;
}

onMounted(async () => {
  await Promise.all([
    assetsStore.loadAccounts(),
    plansStore.loadPlans(),
  ]);

  if (route.params.id) {
    mode.value = 'manual';
    const record = await expensesStore.getById(route.params.id as string);
    if (record) {
      form.value = {
        amount: record.data.amount,
        date: record.data.date,
        category: record.data.category,
        description: record.data.description,
        paymentMethod: record.data.paymentMethod || '',
        linkedPlanId: record.data.linkedPlanId || '',
      };
      tagsStr.value = record.data.tags?.join(',') || '';
    }
  }
});

async function handleSave() {
  if (!form.value.amount || !form.value.date || !form.value.category || !form.value.description) {
    alert('请填写必填项');
    return;
  }

  saving.value = true;
  try {
    const data = {
      amount: form.value.amount,
      date: form.value.date,
      category: form.value.category as ExpenseRecordCategory,
      description: form.value.description,
      paymentMethod: form.value.paymentMethod || undefined,
      linkedPlanId: form.value.linkedPlanId || undefined,
      tags: tagsStr.value ? tagsStr.value.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    };

    if (isEdit.value) {
      await expensesStore.updateRecord(route.params.id as string, data);
    } else {
      await expensesStore.addRecord(data);
    }
    router.back();
  } finally {
    saving.value = false;
  }
}

async function handleDelete() {
  if (!confirm('确定删除该消费记录吗？')) return;
  await expensesStore.deleteRecord(route.params.id as string);
  router.replace('/expenses');
}

// ========== JSON 导入 ==========

function parseJson() {
  importResult.value = null;
  const result = parseExpenseJson(jsonInput.value);
  importResult.value = result;
}

async function batchImport() {
  if (!importResult.value || !importResult.value.success) return;

  importing.value = true;
  try {
    for (const record of importResult.value.records) {
      await expensesStore.addRecord(record.data);
    }
    router.back();
  } catch (e) {
    alert('导入失败: ' + (e instanceof Error ? e.message : String(e)));
  } finally {
    importing.value = false;
  }
}

function copyPrompt() {
  navigator.clipboard.writeText(aiPrompts[activeTemplate.value]).then(() => {
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  }).catch(() => {
    alert('复制失败，请手动复制');
  });
}
</script>

<style scoped>
.expense-form-page {
  padding-bottom: 80px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.page-header h1 {
  font-size: 18px;
  font-weight: 600;
}

.back-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--primary);
  cursor: pointer;
  padding: 4px;
}

/* 模式切换 */
.mode-tabs {
  display: flex;
  margin: 12px 16px;
  background: var(--bg);
  border-radius: var(--radius);
  padding: 3px;
}

.mode-tab {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.mode-tab.active {
  background: var(--card-bg);
  color: var(--primary);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

/* JSON 导入 */
.json-section {
  margin-bottom: 20px;
}

.json-section:last-child {
  margin-bottom: 0;
}

.section-header {
  margin-bottom: 10px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  display: block;
  margin-bottom: 4px;
}

.section-desc {
  font-size: 12px;
  color: var(--text-light);
}

.template-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.template-tab {
  padding: 5px 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  font-size: 12px;
  background: var(--card-bg);
  color: var(--text-secondary);
  cursor: pointer;
}

.template-tab.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.template-box {
  position: relative;
  background: var(--bg);
  border-radius: var(--radius);
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.template-text {
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.btn-copy {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid var(--primary);
  border-radius: var(--radius);
  background: var(--card-bg);
  color: var(--primary);
  cursor: pointer;
}

.json-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 13px;
  font-family: 'SF Mono', 'Menlo', monospace;
  background: var(--bg);
  color: var(--text-primary);
  resize: vertical;
  min-height: 120px;
  margin-bottom: 12px;
}

.json-textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.json-errors {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(255, 77, 79, 0.06);
  border-radius: var(--radius);
  border: 1px solid rgba(255, 77, 79, 0.2);
}

.error-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--danger, #ff4d4f);
  margin-bottom: 8px;
}

.error-item {
  font-size: 12px;
  color: var(--danger, #ff4d4f);
  padding: 3px 0;
}

.json-warnings {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(250, 173, 20, 0.06);
  border-radius: var(--radius);
  border: 1px solid rgba(250, 173, 20, 0.2);
}

.warning-item {
  font-size: 12px;
  color: #d48806;
  padding: 3px 0;
}

.preview-list {
  max-height: 360px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.preview-record {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  border-radius: 6px;
  margin-bottom: 6px;
}

.preview-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.preview-date {
  font-size: 12px;
  color: var(--text-light);
}

.preview-amount {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.preview-cat {
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(74, 144, 217, 0.1);
  color: var(--primary);
  border-radius: 10px;
}

.preview-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.preview-items {
  font-size: 11px;
  color: var(--text-light);
  padding-left: 8px;
  border-left: 2px solid var(--border);
}

.preview-item {
  display: flex;
  gap: 8px;
  padding: 2px 0;
}

.preview-actions {
  margin-top: 8px;
}

/* 表单 */
.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 15px;
  background: var(--card-bg);
  color: var(--text-primary);
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary);
}

.amount-input {
  font-size: 24px;
  font-weight: 600;
  text-align: center;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.form-actions .btn {
  flex: 1;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card-bg);
  color: var(--text-primary);
  cursor: pointer;
}
</style>