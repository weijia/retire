<template>
  <div class="card pension-card" @click="$router.push('/pension')">
    <div class="card-header">
      <span class="card-title">💰 养老金测算</span>
      <span class="card-link">详情 &#8250;</span>
    </div>
    <div v-if="!hasData" class="pension-empty">
      配置养老金参数，查看测算结果
    </div>
    <div v-else class="pension-content">
      <div class="pension-main">
        <span class="pension-amount">{{ formatMoney(monthlyPension) }}</span>
        <span class="pension-unit">/月</span>
      </div>
      <div class="pension-sub">
        共 {{ yearsReceivable }}年 · 总额 {{ formatMoney(totalPension) }}
      </div>
      <div v-if="pensionInTodayMoney > 0" class="pension-compare">
        折算现在购买力约 {{ formatMoney(pensionInTodayMoney) }}/月，相当于现在月薪的 {{ wageCompareRatio }}%
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { useHealthStore } from '../stores/health';
import { usePensionStore } from '../stores/pension';
import { useAvgWageStore } from '../stores/avgWage';
import { formatMoney } from '../utils/format';

const userStore = useUserStore();
const healthStore = useHealthStore();
const pensionStore = usePensionStore();
const avgWageStore = useAvgWageStore();

const monthlyPension = ref(0);
const totalPension = ref(0);
const yearsReceivable = ref(0);
const currentMonthlyWage = ref(0);
const wageCompareRatio = ref(0);
const pensionInTodayMoney = ref(0);

const hasData = computed(() => pensionStore.hasConfig || pensionStore.records.length > 0);

const currentAge = computed(() => {
  if (!userStore.config) return 0;
  return new Date().getFullYear() - userStore.config.data.birthYear;
});

const lifeExpectancy = computed(() => {
  if (!userStore.config || !healthStore.hasProfile) return 0;
  const result = healthStore.computeLifeExpectancy(
    currentAge.value,
    userStore.config.data.gender
  );
  return result.adjustedTotalAge;
});

onMounted(async () => {
  await userStore.loadConfig();
  userStore.checkConfigured();
  await healthStore.loadProfile();
  await pensionStore.loadConfig();
  await pensionStore.loadRecords();
  await pensionStore.loadPhases();
  await avgWageStore.loadDataset();

  if (userStore.config) {
    const le = lifeExpectancy.value || (userStore.config.data.gender === 'male' ? 73.6 : 79.4) + currentAge.value;

    // 构建社平工资 Map（与 Pension.vue 一致）
    const avgWageMap = new Map<number, number>();
    for (const y of avgWageStore.years.value) {
      avgWageMap.set(y.year, y.monthlyAvgWage);
    }

    const result = pensionStore.computePension(currentAge.value, le, new Date().getFullYear(), avgWageMap);
    monthlyPension.value = result.monthlyPension;
    totalPension.value = result.totalPension;
    yearsReceivable.value = result.yearsReceivable;

    // 当前月工资
    const sorted = [...pensionStore.records].sort((a, b) => b.data.year - a.data.year);
    currentMonthlyWage.value = sorted.length > 0 ? sorted[0].data.monthlyBase : 0;

    // 折算到现在的购买力：退休时养老金 × (现在社平工资 / 退休时社平工资)
    const years = avgWageStore.years.value;
    const currentAvgWage = years.length > 0
      ? [...years].sort((a, b) => b.year - a.year)[0].monthlyAvgWage : 0;
    if (currentMonthlyWage.value > 0 && currentAvgWage > 0 && result.retirementAvgWage > 0) {
      pensionInTodayMoney.value = Math.round(result.monthlyPension * currentAvgWage / result.retirementAvgWage);
      wageCompareRatio.value = Math.round(pensionInTodayMoney.value / currentMonthlyWage.value * 1000) / 10;
    }
  }
});
</script>

<style scoped>
.pension-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.pension-card:active {
  transform: scale(0.98);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.card-link {
  font-size: 13px;
  color: var(--primary);
}

.pension-empty {
  text-align: center;
  padding: 16px 0;
  color: var(--text-light);
  font-size: 13px;
}

.pension-main {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.pension-amount {
  font-size: 28px;
  font-weight: 700;
  color: var(--success, #52c41a);
}

.pension-unit {
  font-size: 14px;
  color: var(--text-secondary);
}

.pension-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.pension-compare {
  font-size: 12px;
  color: var(--primary);
  margin-top: 6px;
  padding: 3px 8px;
  background: #e6f0ff;
  border-radius: 4px;
  display: inline-block;
}
</style>
