<template>
  <div class="card le-card" @click="$router.push('/health/result')">
    <div class="card-header">
      <span class="card-title">&#127874; 预期寿命</span>
      <span class="card-link">详情 &#8250;</span>
    </div>
    <div v-if="!hasData" class="le-empty">
      填写健康画像，查看预期寿命
    </div>
    <div v-else class="le-content">
      <div class="le-main">
        <span class="le-age">{{ result.adjustedYears }}</span>
        <span class="le-unit">岁</span>
        <span class="le-delta" :class="result.totalAdjustmentDays >= 0 ? 'positive' : 'negative'">
          {{ result.totalAdjustmentDays >= 0 ? '+' : '' }}{{ (result.totalAdjustmentDays / 365).toFixed(1) }}年
        </span>
      </div>
      <div v-if="todayImpact !== 0" class="le-today">
        今日: {{ todayImpact > 0 ? '+' : '' }}{{ todayImpact.toFixed(1) }}天
        <span :class="todayImpact >= 0 ? 'positive' : 'negative'">
          {{ todayImpact >= 0 ? '&#128994;' : '&#128308;' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useUserStore } from '../stores/user';
import { useHealthStore } from '../stores/health';
import type { LifeExpectancyResult } from '../utils/lifeExpectancy';

const userStore = useUserStore();
const healthStore = useHealthStore();

const result = ref<LifeExpectancyResult>({
  baselineYears: 0,
  adjustedYears: 0,
  totalAdjustmentDays: 0,
  profileAdjustmentDays: 0,
  dailyAdjustmentDays: 0,
  breakdown: [],
});

const hasData = computed(() => healthStore.hasProfile);

const currentAge = computed(() => {
  if (!userStore.config) return 0;
  return new Date().getFullYear() - userStore.config.data.birthYear;
});

const gender = computed(() => userStore.config?.data.gender || 'male');

const todayImpact = computed(() => {
  return healthStore.todayRecords.reduce((sum, r) => sum + r.data.impact, 0);
});

function recalc() {
  if (!userStore.isConfigured || !healthStore.hasProfile) return;
  result.value = healthStore.computeLifeExpectancy(currentAge.value, gender.value);
}

onMounted(async () => {
  await userStore.loadConfig();
  userStore.checkConfigured();
  await healthStore.loadProfile();
  await healthStore.loadDailyRecords();
  recalc();
});

watch(() => healthStore.dailyRecords.length, recalc);
</script>

<style scoped>
.le-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.le-card:active {
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

.le-empty {
  text-align: center;
  padding: 16px 0;
  color: var(--text-light);
  font-size: 13px;
}

.le-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.le-main {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.le-age {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
}

.le-unit {
  font-size: 14px;
  color: var(--text-secondary);
}

.le-delta {
  font-size: 14px;
  font-weight: 600;
  margin-left: 8px;
}

.le-delta.positive { color: var(--success, #52c41a); }
.le-delta.negative { color: var(--danger, #ff4d4f); }

.le-today {
  font-size: 13px;
  color: var(--text-secondary);
}

.le-today .positive { color: var(--success, #52c41a); }
.le-today .negative { color: var(--danger, #ff4d4f); }
</style>
