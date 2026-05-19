<template>
  <div class="home">
    <!-- 顶部栏 -->
    <div class="home-header">
      <h1 class="home-title">退休倒计时</h1>
      <router-link to="/settings" class="settings-btn">⚙️</router-link>
    </div>

    <!-- 未配置提示 -->
    <div v-if="!userStore.isConfigured" class="card setup-prompt">
      <div class="setup-icon">⚙️</div>
      <h2>欢迎使用退休倒计时</h2>
      <p>请先完成基本设置，开始您的退休规划之旅</p>
      <button class="btn btn-primary btn-block" @click="$router.push('/settings')">
        立即设置
      </button>
    </div>

    <template v-else>
      <!-- 倒计时 -->
      <div class="card countdown-wrapper">
        <CountDown
          :birthDate="userStore.config!.data.birthDate"
          :targetAge="userStore.config!.data.targetRetireAge"
        />
      </div>

      <!-- 资产总览 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">资产总览</span>
          <router-link to="/assets" class="card-link">查看全部 ›</router-link>
        </div>
        <div class="total-asset">
          {{ formatMoney(assetsStore.totalAssets) }}
        </div>
        <div class="asset-summary">
          <div
            v-for="(total, type) in assetsStore.totalByType"
            :key="type"
            class="asset-type-item"
          >
            <span class="type-icon">{{ iconMap[type as string] || '💳' }}</span>
            <span class="type-label">{{ AccountTypeLabels[type as keyof typeof AccountTypeLabels] }}</span>
            <span class="type-amount">{{ formatMoney(total) }}</span>
          </div>
        </div>
        <div v-if="Object.keys(assetsStore.totalByType).length === 0" class="empty-hint">
          暂无资产记录，点击下方 + 添加
        </div>
      </div>

      <!-- 本月消费概览 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">本月消费</span>
          <router-link to="/expenses" class="card-link">查看全部 ›</router-link>
        </div>
        <div class="expense-overview">
          <div class="expense-ring">
            <ProgressRing
              :percent="expenseProgress"
              :color="progressColor"
            />
          </div>
          <div class="expense-detail">
            <div class="expense-row">
              <span>计划支出</span>
              <span class="amount">{{ formatMoney(plansStore.monthlyPlanTotal) }}</span>
            </div>
            <div class="expense-row">
              <span>实际支出</span>
              <span class="amount amount-negative">{{ formatMoney(expensesStore.monthlyTotal) }}</span>
            </div>
            <div class="expense-row">
              <span>剩余预算</span>
              <span class="amount" :class="remaining >= 0 ? 'amount-positive' : 'amount-negative'">
                {{ formatMoney(remaining) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 最近消费 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">最近消费</span>
          <router-link to="/expenses" class="card-link">更多 ›</router-link>
        </div>
        <div v-if="expensesStore.recentRecords.length === 0" class="empty-hint">
          暂无消费记录
        </div>
        <ExpenseItem
          v-for="record in expensesStore.recentRecords"
          :key="record._id"
          :record="record"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { useAssetsStore } from '../stores/assets';
import { usePlansStore } from '../stores/plans';
import { useExpensesStore } from '../stores/expenses';
import { formatMoney } from '../utils/format';
import { calcExpenseProgress } from '../utils/calc';
import { AccountTypeLabels } from '../types';
import CountDown from '../components/CountDown.vue';
import ProgressRing from '../components/ProgressRing.vue';
import ExpenseItem from '../components/ExpenseItem.vue';

const userStore = useUserStore();
const assetsStore = useAssetsStore();
const plansStore = usePlansStore();
const expensesStore = useExpensesStore();

const iconMap: Record<string, string> = {
  alipay: '💙',
  bank_deposit: '🏦',
  fund: '📈',
  stock: '📊',
  pension: '👴',
  other: '💳',
};

const expenseProgress = computed(() =>
  calcExpenseProgress(expensesStore.monthlyTotal, plansStore.monthlyPlanTotal)
);

const progressColor = computed(() => {
  if (expenseProgress.value >= 90) return 'var(--danger)';
  if (expenseProgress.value >= 70) return 'var(--warning)';
  return 'var(--primary)';
});

const remaining = computed(() =>
  plansStore.monthlyPlanTotal - expensesStore.monthlyTotal
);

onMounted(async () => {
  await userStore.loadConfig();
  userStore.checkConfigured();
  if (userStore.isConfigured) {
    await Promise.all([
      assetsStore.loadAccounts(),
      plansStore.loadPlans(),
      expensesStore.loadRecords(),
    ]);
  }
});
</script>

<style scoped>
.home {
  padding-top: 0;
}

.home-header {
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

.home-title {
  font-size: 18px;
  font-weight: 600;
}

.settings-btn {
  font-size: 22px;
  text-decoration: none;
  padding: 4px;
}

.setup-prompt {
  text-align: center;
  padding: 32px 20px;
}

.setup-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.setup-prompt h2 {
  font-size: 18px;
  margin-bottom: 8px;
}

.setup-prompt p {
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.countdown-wrapper {
  padding: 0;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-link {
  font-size: 13px;
  color: var(--primary);
  text-decoration: none;
}

.total-asset {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.asset-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.asset-type-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.type-icon {
  font-size: 16px;
}

.type-label {
  flex: 1;
  color: var(--text-secondary);
}

.type-amount {
  font-weight: 500;
}

.expense-overview {
  display: flex;
  align-items: center;
  gap: 20px;
}

.expense-ring {
  flex-shrink: 0;
}

.expense-detail {
  flex: 1;
}

.expense-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}

.expense-row .amount {
  font-weight: 500;
}

.empty-hint {
  text-align: center;
  color: var(--text-light);
  padding: 16px 0;
  font-size: 13px;
}
</style>
