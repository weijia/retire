<template>
  <div class="plans-page">
    <div class="page-header">
      <h1>消费计划</h1>
      <div class="year-selector">
        <button class="year-btn" @click="changeYear(-1)">‹</button>
        <span class="year-text">{{ selectedYear }}年</span>
        <button class="year-btn" @click="changeYear(1)">›</button>
      </div>
    </div>

    <!-- 年度汇总 -->
    <div class="card summary-card">
      <div class="summary-row">
        <span>年度计划总额</span>
        <span class="summary-amount">{{ formatMoney(yearlyTotal) }}</span>
      </div>
      <div class="summary-row">
        <span>月均计划</span>
        <span class="summary-amount">{{ formatMoney(yearlyTotal / 12) }}</span>
      </div>
    </div>

    <div v-if="plansStore.loading" class="empty-state">加载中...</div>

    <div v-else-if="yearPlans.length === 0" class="empty-state">
      <div class="icon">📋</div>
      <p>暂无{{ selectedYear }}年消费计划</p>
      <p>点击下方 + 添加消费计划</p>
    </div>

    <template v-else>
      <div
        v-for="(plans, category) in groupedPlans"
        :key="category"
        class="category-group"
      >
        <div class="group-title">
          <span>{{ ExpenseCategoryLabels[category as ExpenseCategory] }}</span>
          <span>{{ formatMoney(categoryTotal(category as string)) }}/年</span>
        </div>
        <div class="card group-card">
          <div
            v-for="plan in plans"
            :key="plan._id"
            class="plan-item"
            @click="editPlan(plan._id)"
          >
            <div class="plan-info">
              <div class="plan-name">{{ plan.data.name }}</div>
              <div class="plan-detail">
                {{ formatMoney(plan.data.monthlyAmount) }}/月 · {{ frequencyLabel(plan.data.frequency) }}
              </div>
            </div>
            <div class="plan-status">
              <span v-if="!plan.data.isActive" class="status-inactive">已停用</span>
              <span class="plan-annual">{{ formatMoney(plan.data.annualAmount) }}/年</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePlansStore } from '../stores/plans';
import { formatMoney } from '../utils/format';
import { ExpenseCategoryLabels, type ExpenseCategory } from '../types';

const router = useRouter();
const plansStore = usePlansStore();
const selectedYear = ref(new Date().getFullYear());

const yearPlans = computed(() =>
  plansStore.plans.filter(p => p.data.year === selectedYear.value)
);

const yearlyTotal = computed(() =>
  yearPlans.value.filter(p => p.data.isActive).reduce((sum, p) => sum + p.data.annualAmount, 0)
);

const groupedPlans = computed(() => {
  const groups: Record<string, any[]> = {};
  yearPlans.value.forEach(p => {
    const cat = p.data.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  });
  return groups;
});

function categoryTotal(category: string): number {
  return (groupedPlans.value as Record<string, any[]>)[category]
    ?.filter((p: any) => p.data.isActive)
    .reduce((sum: number, p: any) => sum + p.data.annualAmount, 0) || 0;
}

function changeYear(delta: number) {
  selectedYear.value += delta;
}

function frequencyLabel(f: string): string {
  const map: Record<string, string> = {
    monthly: '月缴',
    quarterly: '季缴',
    yearly: '年缴',
    onetime: '一次性',
  };
  return map[f] || f;
}

function editPlan(id: string) {
  router.push(`/plans/edit/${id}`);
}

onMounted(() => {
  plansStore.loadPlans();
});
</script>

<style scoped>
.year-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.year-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--primary);
  cursor: pointer;
  padding: 2px 6px;
}

.year-text {
  font-size: 15px;
  font-weight: 600;
  min-width: 50px;
  text-align: center;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.summary-amount {
  font-weight: 600;
}

.plan-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.plan-item:last-child {
  border-bottom: none;
}

.plan-name {
  font-size: 14px;
  font-weight: 500;
}

.plan-detail {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 2px;
}

.plan-status {
  text-align: right;
}

.status-inactive {
  font-size: 11px;
  color: var(--text-light);
  background: var(--bg);
  padding: 1px 6px;
  border-radius: 4px;
}

.plan-annual {
  font-size: 13px;
  font-weight: 500;
}

.group-card {
  margin-top: 0;
}
</style>
