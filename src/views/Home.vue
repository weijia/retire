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
      <!-- 倒计时（包含目标退休年龄调节） -->
      <div class="card countdown-wrapper compact">
        <CountDown
          :birthYear="userStore.config!.data.birthYear"
          :targetAge="userStore.config!.data.targetRetireAge"
          :label="hasReachedTargetRetire ? '已停止工作' : '距停止工作'"
          :showAgeAdjust="!hasReachedTargetRetire"
          :minAge="40"
          :maxAge="70"
          compact
          @adjustAge="adjustTargetAge"
        />
      </div>

      <!-- 预期寿命卡片 -->
      <LifeExpectancyCard />

      <!-- 养老金卡片 -->
      <PensionCard />

      <!-- 两个退休倒计时 -->
      <div class="card retire-years">
        <template v-if="!hasReachedTargetRetire">
          <div class="retire-year-item">
            <div class="retire-year-label">距停止工作还有 {{ yearsToRetire }} 年</div>
            <div class="retire-year-value retire-years-range">{{ currentYear }}-{{ targetRetireYear }}</div>
          </div>
          <div class="retire-year-divider"></div>
          <div class="retire-year-item">
            <div class="retire-year-label">距领退休金还有</div>
            <div class="retire-year-value">{{ yearsToActualRetire }} 年</div>
          </div>
        </template>
        <template v-else>
          <div class="retire-year-item">
            <div class="retire-year-label">您已停止工作</div>
            <div class="retire-year-value retire-years-range">{{ targetRetireYear }}年</div>
          </div>
          <div class="retire-year-divider"></div>
          <div class="retire-year-item">
            <div class="retire-year-label">距领退休金还有</div>
            <div class="retire-year-value">{{ yearsToActualRetire }} 年</div>
          </div>
        </template>
      </div>

      <!-- 退休时预计资产（实际退休/领退休金时） -->
      <div class="card retirement-estimate">
        <div class="card-header">
          <span class="card-title">领退休金时预计资产</span>
          <span class="card-link" @click="$router.push('/settings')">修改参数 ›</span>
        </div>
        <div class="estimate-amount" :class="{ negative: retirementAssets < 0 }">
          {{ formatMoney(retirementAssets) }}
        </div>
        <div class="estimate-detail">
          <div class="estimate-row">
            <span>已积累资产</span>
            <span>{{ formatMoney(nonSalaryAssets) }}</span>
          </div>
          <div class="estimate-row">
            <span>未来工资收入（到 {{ yearsToRetire > 0 ? '停止工作' : '现在' }}）</span>
            <span class="amount-positive">+{{ formatMoney(getAnnualIncome() * yearsToRetire) }}</span>
          </div>
          <div class="estimate-row">
            <span>未来支出（到领退休金 {{ yearsToActualRetire }} 年）</span>
            <span class="amount-negative">-{{ formatMoney(plansStore.annualPlanTotal * yearsToActualRetire) }}</span>
          </div>
          <div class="estimate-row estimate-divider">
            <span>年均收入 / 支出</span>
            <span>{{ formatMoney(getAnnualIncome()) }} / {{ formatMoney(plansStore.annualPlanTotal) }}</span>
          </div>
        </div>
      </div>

      <!-- 调试信息 -->
      <div class="card" style="background:#f5f5f5; font-size:12px;">
        <div class="card-title">调试</div>
        <div style="padding:8px; color:#666;">
          <div>总资产数: {{ assetsStore.accounts.length }} 个</div>
          <div>资产类型: {{ assetsStore.accounts.map(a=>a.data.accountType).join(', ') }}</div>
          <div>工资资产: {{ assetsStore.accounts.filter(a=>a.data.accountType==='salary_income').length }} 个</div>
          <div>可见工资: {{ assetsStore.visibleAccounts.filter(a=>a.data.accountType==='salary_income').length }} 个</div>
          <div>年收入: {{ getAnnualIncome() }}</div>
          <div>剩余年: {{ yearsToRetire }}</div>
        </div>
      </div>

      <!-- 空窗期消耗 -->
      <div class="card retirement-estimate" v-if="gapYears > 0 && !hasReachedTargetRetire">
        <div class="card-header">
          <span class="card-title">空窗期资产变化</span>
        </div>
        <div class="estimate-subtitle">
          停止工作 {{ userStore.config!.data.targetRetireAge }} 岁 → 领退休金 {{ userStore.config!.data.actualRetireAge }} 岁
        </div>
        <div class="estimate-detail">
          <div class="estimate-row">
            <span>停止工作时资产</span>
            <span>{{ formatMoney(assetsAtTargetRetire) }}</span>
          </div>
          <div class="estimate-row">
            <span>空窗期 {{ gapYears }} 年日常消耗</span>
            <span class="amount-negative">-{{ formatMoney(plansStore.annualPlanTotal * gapYears) }}</span>
          </div>
          <div class="estimate-row" v-if="plansStore.annualSocialPensionTotal > 0">
            <span>空窗期 {{ gapYears }} 年社保缴纳</span>
            <span class="amount-negative">-{{ formatMoney(plansStore.annualSocialPensionTotal * gapYears) }}</span>
          </div>
          <div class="estimate-row estimate-divider">
            <span>空窗期后剩余</span>
            <span :class="assetsAfterGap >= 0 ? 'amount-positive' : 'amount-negative'">
              {{ formatMoney(assetsAfterGap) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 资产总览（目标退休日时） -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">停止工作时总资产</span>
          <router-link to="/assets" class="card-link">查看全部 ›</router-link>
        </div>
        <div class="total-asset">
          {{ formatMoney(assetsAtTargetRetire) }}
        </div>
        <div class="asset-subtitle">
          已积累 {{ formatMoney(nonSalaryAssets) }} + 未来工资 {{ formatMoney(futureSalaryTotal) }} - 未来支出 {{ formatMoney(futureExpenseTotal) }}
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
import { calcExpenseProgress, calcYearsToRetire, calcRetireYear } from '../utils/calc';
import { AccountTypeLabels } from '../types';
import CountDown from '../components/CountDown.vue';
import ProgressRing from '../components/ProgressRing.vue';
import ExpenseItem from '../components/ExpenseItem.vue';
import LifeExpectancyCard from '../components/LifeExpectancyCard.vue';
import PensionCard from '../components/PensionCard.vue';

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

// 距停止工作还有多少年
const yearsToRetire = computed(() => {
  if (!userStore.config) return 0;
  return calcYearsToRetire(userStore.config.data.birthYear, userStore.config.data.targetRetireAge);
});

// 距实际退休（领退休金）还有多少年
const yearsToActualRetire = computed(() => {
  if (!userStore.config) return 0;
  return calcYearsToRetire(userStore.config.data.birthYear, userStore.config.data.actualRetireAge);
});

// 是否已到达目标退休年龄
const hasReachedTargetRetire = computed(() => {
  if (!userStore.config) return false;
  return yearsToRetire.value <= 0;
});

// 当前年份
const currentYear = computed(() => new Date().getFullYear());

// 目标退休年份
const targetRetireYear = computed(() => {
  if (!userStore.config) return 0;
  return calcRetireYear(userStore.config.data.birthYear, userStore.config.data.targetRetireAge);
});

// 已积累资产（排除工资收入资产）
const nonSalaryAssets = computed(() => {
  return assetsStore.visibleAccounts
    .filter(a => a.data.accountType !== 'salary_income')
    .reduce((sum, a) => sum + a.data.balance, 0);
});

// 获取年收入（从工资收入资产解析）
const getAnnualIncome = () => {
  const salaryAccount = assetsStore.getActiveSalaryAccount();
  if (!salaryAccount) {
    console.log('[debug] no salary account');
    return 0;
  }

  const desc = salaryAccount.data.description || '';
  console.log('[debug] salary account:', { name: salaryAccount.data.name, desc, balance: salaryAccount.data.balance });

  // 从 description 解析收入类型和金额
  // 格式："月收入: 15000" 或 "年收入: 180000"
  const monthlyMatch = desc.match(/月收入:\s*(\d+)/);
  if (monthlyMatch) {
    console.log('[debug] monthly match:', monthlyMatch[1]);
    return parseInt(monthlyMatch[1]) * 12;
  }

  const yearlyMatch = desc.match(/年收入:\s*(\d+)/);
  if (yearlyMatch) {
    console.log('[debug] yearly match:', yearlyMatch[1]);
    return parseInt(yearlyMatch[1]);
  }

  // 兼容旧数据：从 name 解析月收入，格式："工资收入 (15000/月 x 120月)"
  const nameMatch = salaryAccount.data.name.match(/(\d+)\/月/);
  if (nameMatch) {
    console.log('[debug] name match:', nameMatch[1]);
    return parseInt(nameMatch[1]) * 12;
  }

  // 如果都无法解析，假设余额是月收入
  console.log('[debug] fallback, balance*12:', salaryAccount.data.balance * 12);
  return salaryAccount.data.balance * 12;
};

// 未来工资总收入 = 年收入 × 剩余工作年数
const futureSalaryTotal = computed(() => {
  return getAnnualIncome() * yearsToRetire.value;
});

// 未来总支出（到停止工作时）
const futureExpenseTotal = computed(() => {
  return plansStore.annualPlanTotal * yearsToRetire.value;
});

// 停止工作时总资产 = 已积累 + 未来工资 - 未来支出
const assetsAtTargetRetire = computed(() => {
  return nonSalaryAssets.value + futureSalaryTotal.value - futureExpenseTotal.value;
});

// 领退休金时预计资产 = 已积累 + 未来工资(到领退休金) - 日常支出(到领退休金) - 社保(仅空窗期)
const retirementAssets = computed(() => {
  // 工资只发到目标退休年龄（停止工作时），之后是空窗期没有工资收入
  const salaryUntilTargetRetire = getAnnualIncome() * yearsToRetire.value;
  // 日常支出一直计算到领退休金
  const expenseUntilActualRetire = plansStore.annualPlanTotal * yearsToActualRetire.value;
  // 社保只在空窗期需要自己缴纳
  const socialPensionDuringGap = plansStore.annualSocialPensionTotal * gapYears.value;
  return nonSalaryAssets.value + salaryUntilTargetRetire - expenseUntilActualRetire - socialPensionDuringGap;
});

// 空窗期后剩余资产 = 停止工作时资产 - 空窗期日常消耗 - 空窗期社保缴纳
const assetsAfterGap = computed(() => {
  return assetsAtTargetRetire.value
    - plansStore.annualPlanTotal * gapYears.value
    - plansStore.annualSocialPensionTotal * gapYears.value;
});

// 实际退休时盈余计算（空窗期消耗）
const gapYears = computed(() => {
  if (!userStore.config) return 0;
  return Math.max(0, userStore.config.data.actualRetireAge - userStore.config.data.targetRetireAge);
});

// 调整目标退休年龄
async function adjustTargetAge(delta: number) {
  if (!userStore.config) return;
  const newAge = userStore.config.data.targetRetireAge + delta;
  if (newAge < 40 || newAge > 70) return;
  if (newAge >= userStore.config.data.actualRetireAge) {
    alert('目标退休年龄必须小于实际退休年龄（领退休金年龄）');
    return;
  }
  await userStore.saveConfig({
    ...userStore.config.data,
    targetRetireAge: newAge,
  });
}

onMounted(async () => {
  await userStore.loadConfig();
  userStore.checkConfigured();
  if (userStore.isConfigured) {
    await Promise.all([
      assetsStore.loadAccounts(),
      plansStore.loadPlans(),
      expensesStore.loadRecords(),
    ]);
    // 自动记录固定支出
    if (plansStore.fixedPlans.length > 0) {
      await expensesStore.autoRecordFixedExpenses(plansStore.fixedPlans);
    }
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

.countdown-wrapper.compact {
  padding: 8px 0;
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
  margin-bottom: 4px;
}

.asset-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
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

.retirement-estimate .estimate-amount {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary);
  text-align: center;
  margin: 8px 0 12px;
}

.retirement-estimate .estimate-amount.negative {
  color: var(--danger);
}

.retirement-estimate .estimate-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: 4px;
}

.retire-years {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 16px 0;
}

.retire-year-item {
  flex: 1;
  text-align: center;
}

.retire-year-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.retire-year-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary);
}

.retire-year-value.retire-status.passed {
  font-size: 16px;
  color: var(--success, #52c41a);
}

.retire-year-value.retire-years-range {
  font-size: 18px;
  color: var(--text-secondary);
}

.retire-year-divider {
  width: 1px;
  height: 40px;
  background: var(--border);
}

.estimate-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.estimate-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
}

.estimate-divider {
  border-top: 1px dashed var(--border);
  padding-top: 6px;
  margin-top: 2px;
}
</style>
