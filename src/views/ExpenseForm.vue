<template>
  <div class="expense-form-page">
    <div class="page-header">
      <button class="back-btn" @click="$router.back()">‹ 返回</button>
      <h1>{{ isEdit ? '编辑消费' : '记录消费' }}</h1>
      <span></span>
    </div>

    <div class="card">
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

const route = useRoute();
const router = useRouter();
const expensesStore = useExpensesStore();
const assetsStore = useAssetsStore();
const plansStore = usePlansStore();
const saving = ref(false);
const tagsStr = ref('');

const isEdit = computed(() => !!route.params.id);

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

onMounted(async () => {
  await Promise.all([
    assetsStore.loadAccounts(),
    plansStore.loadPlans(),
  ]);

  if (route.params.id) {
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
</script>

<style scoped>
.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.form-actions .btn {
  flex: 1;
}

.amount-input {
  font-size: 24px;
  font-weight: 600;
  text-align: center;
}
</style>
