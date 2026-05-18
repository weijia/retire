<template>
  <div class="plan-form-page">
    <div class="page-header">
      <button class="back-btn" @click="$router.back()">‹ 返回</button>
      <h1>{{ isEdit ? '编辑计划' : '添加计划' }}</h1>
      <span></span>
    </div>

    <div class="card">
      <div class="form-group">
        <label class="form-label">计划名称 *</label>
        <input v-model="form.name" class="form-input" placeholder="如：社保养老金" />
      </div>

      <div class="form-group">
        <label class="form-label">消费类别 *</label>
        <select v-model="form.category" class="form-select">
          <option value="">请选择</option>
          <option v-for="(label, key) in ExpenseCategoryLabels" :key="key" :value="key">
            {{ label }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">计划年份 *</label>
        <input v-model.number="form.year" type="number" class="form-input" min="2020" max="2100" />
      </div>

      <div class="form-group">
        <label class="form-label">年度金额（元）*</label>
        <input v-model.number="form.annualAmount" type="number" class="form-input" placeholder="0.00" step="0.01" @input="calcMonthly" />
      </div>

      <div class="form-group">
        <label class="form-label">月度金额（元）</label>
        <input v-model.number="form.monthlyAmount" type="number" class="form-input" step="0.01" />
        <div class="form-hint">自动计算 = 年度金额 / 12</div>
      </div>

      <div class="form-group">
        <label class="form-label">缴费频率</label>
        <select v-model="form.frequency" class="form-select">
          <option value="monthly">月缴</option>
          <option value="quarterly">季缴</option>
          <option value="yearly">年缴</option>
          <option value="onetime">一次性</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">备注</label>
        <input v-model="form.description" class="form-input" placeholder="可选" />
      </div>

      <div class="form-group checkbox-group">
        <label>
          <input type="checkbox" v-model="form.isActive" />
          <span>启用此计划</span>
        </label>
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
import { usePlansStore } from '../stores/plans';
import { ExpenseCategoryLabels, type ExpenseCategory } from '../types';

const route = useRoute();
const router = useRouter();
const plansStore = usePlansStore();
const saving = ref(false);

const isEdit = computed(() => !!route.params.id);

const form = ref({
  name: '',
  category: '' as ExpenseCategory | '',
  year: new Date().getFullYear(),
  annualAmount: 0,
  monthlyAmount: 0,
  frequency: 'monthly' as 'monthly' | 'quarterly' | 'yearly' | 'onetime',
  description: '',
  isActive: true,
});

function calcMonthly() {
  form.value.monthlyAmount = Math.round((form.value.annualAmount / 12) * 100) / 100;
}

onMounted(async () => {
  if (route.params.id) {
    const plan = await plansStore.getById(route.params.id as string);
    if (plan) {
      form.value = {
        name: plan.data.name,
        category: plan.data.category,
        year: plan.data.year,
        annualAmount: plan.data.annualAmount,
        monthlyAmount: plan.data.monthlyAmount,
        frequency: plan.data.frequency,
        description: plan.data.description || '',
        isActive: plan.data.isActive,
      };
    }
  }
});

async function handleSave() {
  if (!form.value.name || !form.value.category) {
    alert('请填写必填项');
    return;
  }

  saving.value = true;
  try {
    const data = { ...form.value, category: form.value.category as ExpenseCategory };
    if (isEdit.value) {
      await plansStore.updatePlan(route.params.id as string, data as any);
    } else {
      await plansStore.addPlan(data as any);
    }
    router.back();
  } finally {
    saving.value = false;
  }
}

async function handleDelete() {
  if (!confirm('确定删除该消费计划吗？')) return;
  await plansStore.deletePlan(route.params.id as string);
  router.replace('/plans');
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

.form-hint {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 4px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}
</style>
