<template>
  <div class="pension-page">
    <div class="page-header">
      <button class="back-btn" @click="$router.back()">&#8249; 返回</button>
      <h1>养老金测算</h1>
      <span></span>
    </div>

    <!-- 未配置提示 -->
    <div v-if="!userStore.isConfigured" class="card setup-prompt">
      <div class="setup-icon">⚙️</div>
      <h2>请先完成基本设置</h2>
      <p>需要出生年份和退休年龄信息</p>
      <button class="btn btn-primary btn-block" @click="$router.push('/settings')">
        去设置
      </button>
    </div>

    <template v-else>
      <!-- 测算参数 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">📋 测算参数</span>
          <span class="card-link" @click="showConfig = true">修改 &#8250;</span>
        </div>
        <div class="config-display">
          <div class="config-row">
            <span>当前个人账户余额</span>
            <span>{{ formatMoney(pensionConfig.currentPensionBalance) }}</span>
          </div>
          <div class="config-row">
            <span>法定退休年龄</span>
            <span>{{ pensionConfig.retirementAge }}岁</span>
          </div>
          <div v-if="pensionConfig.hasTransitionalPension" class="config-row">
            <span>视同缴费年限</span>
            <span>{{ pensionConfig.deemedYears }}年</span>
          </div>
        </div>
      </div>

      <!-- 测算结果 -->
      <div v-if="hasResult && pensionResult" class="card result-card">
        <div class="result-header">
          <span class="card-title">💰 测算结果</span>
        </div>
        <div class="result-grid">
          <div class="result-item">
            <div class="result-label">预期寿命</div>
            <div class="result-value">{{ lifeExpectancy.toFixed(1) }}岁</div>
          </div>
          <div class="result-item">
            <div class="result-label">退休年龄</div>
            <div class="result-value">{{ pensionConfig.retirementAge }}岁</div>
          </div>
          <div class="result-item">
            <div class="result-label">可领取年数</div>
            <div class="result-value">{{ pensionResult!.yearsReceivable }}年</div>
          </div>
        </div>
        <div class="result-divider"></div>
        <div class="result-main">
          <div class="result-amount">{{ formatMoney(pensionResult!.monthlyPension) }}<span class="result-unit">/月</span></div>
          <div class="result-sub">年养老金 {{ formatMoney(pensionResult!.annualPension) }}</div>
        </div>
        <div class="result-breakdown">
          <div class="breakdown-row">
            <span>基础养老金</span>
            <span>{{ formatMoney(pensionResult!.basicPension) }}</span>
          </div>
          <div class="breakdown-row">
            <span>个人账户养老金</span>
            <span>{{ formatMoney(pensionResult!.personalPension) }}</span>
          </div>
          <div v-if="pensionResult!.transitionalPension > 0" class="breakdown-row">
            <span>过渡性养老金</span>
            <span>{{ formatMoney(pensionResult!.transitionalPension) }}</span>
          </div>
        </div>
        <div class="result-total">
          养老金总额: {{ formatMoney(pensionResult!.totalPension) }}
        </div>
      </div>

      <!-- 计算明细 -->
      <div v-if="hasResult && pensionResult" class="card">
        <div class="card-title">📊 计算明细</div>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">退休时社平工资</span>
            <span class="detail-value">{{ formatMoney(pensionResult!.retirementAvgWage) }}/月</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">平均缴费指数</span>
            <span class="detail-value">{{ pensionResult!.averageWageIndex }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">实际缴费年限</span>
            <span class="detail-value">{{ pensionResult!.totalYearsPaid }}年</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">总缴费年限</span>
            <span class="detail-value">{{ pensionResult!.totalYears }}年</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">个人账户余额</span>
            <span class="detail-value">{{ formatMoney(pensionResult!.personalAccountBalance) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">计发月数</span>
            <span class="detail-value">{{ getPayoutMonths(pensionConfig.retirementAge) }}</span>
          </div>
        </div>
      </div>

      <!-- 历年缴费明细 -->
      <div v-if="hasResult && pensionResult && pensionResult!.yearlyDetails.length > 0" class="card">
        <div class="card-title">📜 历年缴费明细</div>
        <div class="yearly-table">
          <div class="table-header">
            <span>年份</span>
            <span>缴费基数</span>
            <span>社平工资</span>
            <span>缴费指数</span>
            <span>个人账户</span>
          </div>
          <div v-for="row in pensionResult!.yearlyDetails" :key="row.year" class="table-row">
            <span>{{ row.year }}</span>
            <span>{{ formatMoney(row.monthlyBase) }}</span>
            <span>{{ formatMoney(row.avgWage) }}</span>
            <span>{{ row.wageIndex }}</span>
            <span>{{ formatMoney(row.accountBalanceEOY) }}</span>
          </div>
        </div>
      </div>

      <!-- 资产充足性 -->
      <div v-if="hasResult && sufficiency" class="card">
        <div class="card-title">📈 资产充足性分析</div>
        <div class="sufficiency-detail">
          <div class="suff-row">
            <span>退休时总资产</span>
            <span>{{ formatMoney(sufficiency.retirementAssets) }}</span>
          </div>
          <div class="suff-row">
            <span>+ 养老金总额</span>
            <span>{{ formatMoney(sufficiency.pensionTotal) }}</span>
          </div>
          <div class="suff-row suff-divider">
            <span>= 总可用资金</span>
            <span class="amount-bold">{{ formatMoney(sufficiency.totalAvailable) }}</span>
          </div>
          <div class="suff-row">
            <span>月均可用</span>
            <span>{{ formatMoney(sufficiency.monthlyAvailable) }}</span>
          </div>
          <div class="suff-row">
            <span>月均支出</span>
            <span>{{ formatMoney(sufficiency.monthlyExpense) }}</span>
          </div>
        </div>
        <div
          class="sufficiency-status"
          :class="sufficiency.isSufficient ? 'sufficient' : 'insufficient'"
        >
          <span v-if="sufficiency.isSufficient">✅ 资产充足</span>
          <span v-else>❗ 资金缺口 {{ formatMoney(sufficiency.gap) }}</span>
        </div>
      </div>

      <!-- 缴存记录入口 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">💵 缴存记录</span>
          <router-link to="/pension/records" class="card-link">管理 &#8250;</router-link>
        </div>
        <div class="records-summary">
          <div class="summary-item">
            <span class="summary-label">累计缴费</span>
            <span class="summary-value">{{ pensionStore.totalYearsPaid.toFixed(1) }}年</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">个人缴费</span>
            <span class="summary-value">{{ formatMoney(pensionStore.totalPersonalPaid) }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 配置弹窗 -->
    <div v-if="showConfig" class="modal-overlay" @click="showConfig = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>修改测算参数</h3>
          <button class="modal-close" @click="showConfig = false">&#215;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">当前个人账户余额（元）</label>
            <input v-model.number="editConfig.currentPensionBalance" type="number" class="form-input" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">法定退休年龄</label>
            <input v-model.number="editConfig.retirementAge" type="number" class="form-input" min="50" max="70" />
          </div>
          <div class="form-group">
            <label class="checkbox-item">
              <input type="checkbox" v-model="editConfig.hasTransitionalPension" />
              <span>有视同缴费年限（1996年前参加工作）</span>
            </label>
          </div>
          <div v-if="editConfig.hasTransitionalPension" class="form-group">
            <label class="form-label">视同缴费年限（年）</label>
            <input v-model.number="editConfig.deemedYears" type="number" class="form-input" min="0" max="40" />
          </div>
          <div v-if="editConfig.hasTransitionalPension" class="form-group">
            <label class="form-label">视同缴费指数</label>
            <input v-model.number="editConfig.deemedIndex" type="number" class="form-input" min="0.6" max="3" step="0.1" />
          </div>
          <div v-if="editConfig.hasTransitionalPension" class="form-group">
            <label class="form-label">过渡系数（%）</label>
            <input v-model.number="editConfig.transitionalRate" type="number" class="form-input" min="1" max="1.4" step="0.1" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary btn-block" @click="saveConfig">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { useHealthStore } from '../stores/health';
import { usePensionStore } from '../stores/pension';
import { usePlansStore } from '../stores/plans';
import { formatMoney } from '../utils/format';
import { getPayoutMonths } from '../utils/pensionCalc';
import type { PensionCalculationResult, SufficiencyResult } from '../utils/pensionCalc';

const userStore = useUserStore();
const healthStore = useHealthStore();
const pensionStore = usePensionStore();
const plansStore = usePlansStore();

const showConfig = ref(false);
const pensionResult = ref<PensionCalculationResult | null>(null);
const sufficiency = ref<SufficiencyResult | null>(null);

const pensionConfig = ref({
  pensionType: 'basic' as 'basic' | 'supplementary' | 'both',
  currentPensionBalance: 0,
  retirementAge: 60,
  hasTransitionalPension: false,
  deemedYears: 0,
  deemedIndex: 1.0,
  transitionalRate: 1.3,
});

const editConfig = ref({ ...pensionConfig.value });

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

const hasResult = computed(() => !!pensionResult.value);

function calcPension() {
  if (!userStore.config) return;
  const le = lifeExpectancy.value || (userStore.config.data.gender === 'male' ? 73.6 : 79.4) + currentAge.value;
  pensionResult.value = pensionStore.computePension(
    currentAge.value,
    le,
    new Date().getFullYear()
  );

  sufficiency.value = pensionStore.computeSufficiency(
    0,
    pensionResult.value,
    plansStore.annualPlanTotal
  );
}

async function saveConfig() {
  await pensionStore.saveConfig(editConfig.value);
  pensionConfig.value = { ...editConfig.value };
  showConfig.value = false;
  calcPension();
}

onMounted(async () => {
  await userStore.loadConfig();
  userStore.checkConfigured();
  await healthStore.loadProfile();
  await pensionStore.loadConfig();
  await pensionStore.loadRecords();
  await plansStore.loadPlans();

  if (pensionStore.config) {
    pensionConfig.value = { ...pensionStore.config.data };
    editConfig.value = { ...pensionStore.config.data };
  }

  calcPension();
});
</script>

<style scoped>
.pension-page {
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

.setup-prompt {
  text-align: center;
  padding: 32px 20px;
  margin: 16px;
}

.setup-icon {
  font-size: 48px;
  margin-bottom: 16px;
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
  cursor: pointer;
}

.config-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
}

.result-card {
  margin: 16px;
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  color: white;
}

.result-header {
  margin-bottom: 12px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.result-item {
  text-align: center;
}

.result-item .result-label {
  font-size: 12px;
  opacity: 0.85;
}

.result-item .result-value {
  font-size: 18px;
  font-weight: 600;
}

.result-divider {
  height: 1px;
  background: rgba(255,255,255,0.3);
  margin: 12px 0;
}

.result-main {
  text-align: center;
  margin-bottom: 8px;
}

.result-amount {
  font-size: 36px;
  font-weight: 700;
}

.result-unit {
  font-size: 16px;
  font-weight: 400;
  margin-left: 4px;
}

.result-sub {
  font-size: 13px;
  opacity: 0.9;
  margin-top: 4px;
}

.result-breakdown {
  margin: 12px 0;
  padding: 12px;
  background: rgba(255,255,255,0.15);
  border-radius: 8px;
}

.breakdown-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
}

.result-total {
  text-align: center;
  font-size: 14px;
  opacity: 0.9;
  margin-top: 8px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  background: var(--bg);
  border-radius: var(--radius);
}

.detail-label {
  font-size: 12px;
  color: var(--text-light);
}

.detail-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.yearly-table {
  font-size: 12px;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1.2fr 0.8fr 1.2fr;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  color: var(--text-light);
  font-weight: 600;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1.2fr 0.8fr 1.2fr;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  color: var(--text-secondary);
}

.sufficiency-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suff-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
}

.suff-divider {
  border-top: 1px dashed var(--border);
  padding-top: 8px;
  margin-top: 4px;
}

.amount-bold {
  font-weight: 600;
  color: var(--text-primary);
}

.sufficiency-status {
  text-align: center;
  padding: 12px;
  border-radius: var(--radius);
  margin-top: 12px;
  font-size: 14px;
  font-weight: 600;
}

.sufficiency-status.sufficient {
  background: rgba(82, 196, 26, 0.1);
  color: var(--success, #52c41a);
}

.sufficiency-status.insufficient {
  background: rgba(255, 77, 79, 0.1);
  color: var(--danger, #ff4d4f);
}

.records-summary {
  display: flex;
  gap: 24px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label {
  font-size: 12px;
  color: var(--text-light);
}

.summary-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.modal-content {
  background: var(--card-bg);
  width: 100%;
  max-width: 480px;
  border-radius: 16px 16px 0 0;
  padding: 20px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-header h3 {
  font-size: 18px;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-light);
  cursor: pointer;
}

.modal-body {
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 15px;
  background: var(--card-bg);
  color: var(--text-primary);
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}

.checkbox-item input {
  width: 18px;
  height: 18px;
}
</style>
