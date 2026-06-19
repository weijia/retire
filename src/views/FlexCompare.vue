<template>
  <div class="page">
    <div class="page-header">
      <button class="back-btn" @click="$router.back()">‹</button>
      <h1 class="page-title">灵活就业方案对比</h1>
    </div>

    <!-- 说明 -->
    <div class="card">
      <div class="info-title">💡 功能说明</div>
      <div class="info-desc">
        对比不同灵活就业缴费方案的退休金差异，帮助您选择最优方案。
        以下方案基于您已有的缴费记录，叠加不同的灵活就业策略。
      </div>
    </div>

    <!-- 自定义方案 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">⚙️ 自定义方案</span>
      </div>
      <div class="custom-form">
        <div class="form-row">
          <div class="form-group half">
            <label class="form-label">缴费档次</label>
            <div class="flex-presets">
              <button
                v-for="pct in [60, 80, 100, 200, 300]"
                :key="pct"
                class="preset-btn"
                :class="{ active: customPlan.basePercent === pct }"
                @click="customPlan.basePercent = pct"
              >{{ pct }}%</button>
            </div>
          </div>
          <div class="form-group half">
            <label class="form-label">缴费年限</label>
            <input v-model.number="customPlan.years" type="number" class="form-input" min="1" max="30" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group half">
            <label class="form-label">退休年龄</label>
            <input v-model.number="customPlan.retirementAge" type="number" class="form-input" min="50" max="70" />
          </div>
          <div class="form-group half">
            <label class="form-label">每年缴费月数</label>
            <input v-model.number="customPlan.monthsPerYear" type="number" class="form-input" min="1" max="12" />
          </div>
        </div>
        <button class="btn btn-primary" @click="addCustomPlan">添加对比</button>
      </div>
    </div>

    <!-- 对比表格 -->
    <div v-if="results.length > 0" class="card">
      <div class="card-header">
        <span class="card-title">📊 方案对比</span>
      </div>

      <div class="compare-table-wrapper">
        <table class="compare-table">
          <thead>
            <tr>
              <th>方案</th>
              <th>缴费档次</th>
              <th>缴费年限</th>
              <th>退休年龄</th>
              <th>个人总缴费</th>
              <th>月养老金</th>
              <th>年养老金</th>
              <th>养老金总额</th>
              <th>投入产出比</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(r, idx) in sortedResults"
              :key="idx"
              :class="{ best: idx === 0, worst: idx === sortedResults.length - 1 }"
            >
              <td class="plan-name">{{ r.plan.name }}</td>
              <td>{{ r.plan.basePercent }}%</td>
              <td>{{ r.plan.endYear - r.plan.startYear + 1 }}年</td>
              <td>{{ r.plan.retirementAge }}岁</td>
              <td>{{ formatMoney(r.totalPersonalPaid) }}</td>
              <td class="highlight">{{ formatMoney(r.monthlyPension) }}</td>
              <td>{{ formatMoney(r.annualPension) }}</td>
              <td>{{ formatMoney(r.totalPension) }}</td>
              <td>{{ r.roi }}x</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 最佳方案提示 -->
      <div v-if="sortedResults.length > 0" class="best-plan">
        <div class="best-label">🏆 月养老金最高</div>
        <div class="best-value">
          {{ sortedResults[0].plan.name }}：{{ formatMoney(sortedResults[0].monthlyPension) }}/月
        </div>
      </div>
    </div>

    <!-- 详细分解 -->
    <div v-if="results.length > 0" class="card">
      <div class="card-title">📈 详细分解（含计算过程）</div>
      <div v-for="(r, idx) in results" :key="idx" class="detail-card">
        <div class="detail-header">
          <span class="detail-name">{{ r.plan.name }}</span>
          <span class="detail-pension">{{ formatMoney(r.monthlyPension) }}/月</span>
        </div>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">基础养老金</span>
            <span class="detail-value">{{ formatMoney(r.basicPension) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">个人账户养老金</span>
            <span class="detail-value">{{ formatMoney(r.personalPension) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">退休时账户余额</span>
            <span class="detail-value">{{ formatMoney(r.personalAccountBalance) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">计发月数</span>
            <span class="detail-value">{{ r.payoutMonths }}个月</span>
          </div>
        </div>
        <div class="calc-process">
          <div class="calc-title">计算过程</div>
          <div class="calc-row">
            <span>退休时社平工资</span>
            <span>{{ formatMoney(r.retirementAvgWage) }}/月</span>
          </div>
          <div class="calc-row">
            <span>社平工资年增长率</span>
            <span>{{ r.avgGrowthRate }}%</span>
          </div>
          <div class="calc-row">
            <span>平均缴费指数</span>
            <span>{{ r.averageWageIndex }}</span>
          </div>
          <div class="calc-row">
            <span>总缴费年限</span>
            <span>{{ r.totalYears.toFixed(1) }}年</span>
          </div>
          <div class="calc-row">
            <span>基础养老金公式</span>
            <span class="formula">{{ formatMoney(r.retirementAvgWage) }} × (1+{{ r.averageWageIndex }})/2 × {{ r.totalYears.toFixed(1) }} × 1%</span>
          </div>
          <div class="calc-row">
            <span>个人账户养老金公式</span>
            <span class="formula">{{ formatMoney(r.personalAccountBalance) }} ÷ {{ r.payoutMonths }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usePensionStore } from '../stores/pension';
import { useAvgWageStore } from '../stores/avgWage';
import { useUserStore } from '../stores/user';
import { useHealthStore } from '../stores/health';
import { formatMoney } from '../utils/format';
import {
  generateDefaultPlans,
  compareFlexPlans,
  type FlexPlanResult,
} from '../utils/pensionCompare';

const pensionStore = usePensionStore();
const avgWageStore = useAvgWageStore();
const userStore = useUserStore();
const healthStore = useHealthStore();

const results = ref<FlexPlanResult[]>([]);
const customPlan = ref({
  basePercent: 60,
  years: 5,
  retirementAge: 60,
  monthsPerYear: 12,
});

const currentYear = new Date().getFullYear();
const currentAge = computed(() => {
  if (!userStore.config) return 46;
  return currentYear - userStore.config.data.birthYear;
});

const lifeExpectancy = computed(() => {
  if (!userStore.config || !healthStore.hasProfile) return 80;
  const result = healthStore.computeLifeExpectancy(
    currentAge.value,
    userStore.config.data.gender
  );
  return result.adjustedTotalAge;
});

const defaultRetirementAge = computed(() => {
  return pensionStore.config?.data.retirementAge || 60;
});

const avgWageMap = computed(() => {
  const map = new Map<number, number>();
  for (const y of avgWageStore.years.value) {
    map.set(y.year, y.monthlyAvgWage);
  }
  return map;
});

const sortedResults = computed(() => {
  return [...results.value].sort((a, b) => b.monthlyPension - a.monthlyPension);
});

function calculate() {
  const plans = generateDefaultPlans(
    currentYear,
    currentAge.value,
    defaultRetirementAge.value
  );

  // 添加自定义方案
  plans.push({
    name: `自定义(${customPlan.value.basePercent}%,${customPlan.value.years}年)`,
    startYear: currentYear,
    endYear: currentYear + customPlan.value.years - 1,
    basePercent: customPlan.value.basePercent,
    monthsPerYear: customPlan.value.monthsPerYear,
    retirementAge: customPlan.value.retirementAge,
  });

  results.value = compareFlexPlans(
    plans,
    pensionStore.records,
    pensionStore.config,
    currentAge.value,
    lifeExpectancy.value,
    currentYear,
    avgWageMap.value
  );
}

function addCustomPlan() {
  calculate();
}

onMounted(async () => {
  await userStore.loadConfig();
  await healthStore.loadProfile();
  await pensionStore.loadConfig();
  await pensionStore.loadRecords();
  await avgWageStore.loadDataset();
  calculate();
});
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

.info-title {
  font-size: 14px;
  font-weight: 600;
  color: #4A90D9;
  margin-bottom: 8px;
}

.info-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}

.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.form-group {
  flex: 1;
}

.form-group.half {
  flex: 1;
}

.form-label {
  display: block;
  font-size: 13px;
  color: #999;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 15px;
  box-sizing: border-box;
}

.flex-presets {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.preset-btn {
  padding: 6px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: #f5f5f5;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn.active {
  border-color: #4A90D9;
  background: #4A90D9;
  color: #fff;
  font-weight: 600;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  cursor: pointer;
}

.btn-primary {
  background: #4A90D9;
  color: #fff;
}

.compare-table-wrapper {
  overflow-x: auto;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.compare-table th {
  background: #f8f9fa;
  padding: 10px 8px;
  text-align: center;
  font-weight: 600;
  color: #666;
  white-space: nowrap;
}

.compare-table td {
  padding: 10px 8px;
  text-align: center;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}

.compare-table tr.best td {
  background: #e6f7e6;
}

.compare-table tr.worst td {
  background: #fff1f0;
}

.plan-name {
  font-weight: 600;
  color: #333;
}

.highlight {
  font-weight: 600;
  color: #4A90D9;
}

.best-plan {
  margin-top: 16px;
  padding: 12px;
  background: #e6f7e6;
  border-radius: 8px;
  text-align: center;
}

.best-label {
  font-size: 13px;
  color: #52c41a;
  margin-bottom: 4px;
}

.best-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.detail-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8e8e8;
}

.detail-name {
  font-weight: 600;
  font-size: 14px;
}

.detail-pension {
  font-size: 16px;
  font-weight: 600;
  color: #4A90D9;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.detail-label {
  color: #999;
}

.detail-value {
  color: #333;
  font-weight: 500;
}
.calc-process {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #e8e8e8;
}

.calc-title {
  font-size: 12px;
  font-weight: 600;
  color: #999;
  margin-bottom: 6px;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #999;
  padding: 2px 0;
}

.calc-row .formula {
  color: #4A90D9;
  font-family: monospace;
  font-size: 10px;
  max-width: 60%;
  text-align: right;
}
</style>
