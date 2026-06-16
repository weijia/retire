<template>
  <div class="health-result-page">
    <div class="page-header">
      <button class="back-btn" @click="$router.back()">&#8249; 返回</button>
      <h1>预期寿命评估</h1>
      <span></span>
    </div>

    <!-- 未配置提示 -->
    <div v-if="!userStore.isConfigured" class="card setup-prompt">
      <div class="setup-icon">&#9881;&#65039;</div>
      <h2>请先完成基本设置</h2>
      <p>需要出生年份和性别信息来计算预期寿命</p>
      <button class="btn btn-primary btn-block" @click="$router.push('/settings')">
        去设置
      </button>
    </div>

    <div v-else-if="!healthStore.hasProfile" class="card setup-prompt">
      <div class="setup-icon">&#129504;</div>
      <h2>请先填写健康画像</h2>
      <p>填写您的健康基线数据，开始预期寿命评估</p>
      <button class="btn btn-primary btn-block" @click="$router.push('/health')">
        填写健康画像
      </button>
    </div>

    <template v-else>
      <!-- 预期寿命主展示 -->
      <div class="card result-card">
        <div class="result-icon">&#127874;</div>
        <div class="result-label">预期寿命</div>
        <div class="result-value">{{ result.adjustedYears }} <span class="result-unit">岁</span></div>
        <div class="result-detail">
          基准 {{ result.baselineYears }} + 调整 {{ result.totalAdjustmentDays >= 0 ? '+' : '' }}{{ (result.totalAdjustmentDays / 365).toFixed(1) }}年
        </div>
      </div>

      <!-- 因素影响分析 -->
      <div class="card">
        <div class="card-title">&#128202; 因素影响分析</div>
        <div class="factor-list">
          <div
            v-for="item in result.breakdown"
            :key="item.factorName"
            class="factor-item"
          >
            <span class="factor-name">{{ getFactorIcon(item.factorName) }} {{ item.factorName }}</span>
            <div class="factor-bar-wrapper">
              <div
                class="factor-bar"
                :class="item.adjustmentDays >= 0 ? 'positive' : 'negative'"
                :style="{ width: getBarWidth(item.adjustmentDays) + '%' }"
              ></div>
            </div>
            <span class="factor-value" :class="item.adjustmentDays >= 0 ? 'positive' : 'negative'">
              {{ item.adjustmentDays >= 0 ? '+' : '' }}{{ (item.adjustmentDays / 365).toFixed(1) }}年
            </span>
          </div>
        </div>
      </div>

      <!-- 改善建议 -->
      <div v-if="suggestions.length > 0" class="card">
        <div class="card-title">&#128161; 改善建议</div>
        <ul class="suggestion-list">
          <li v-for="(s, i) in suggestions" :key="i" class="suggestion-item">
            {{ s }}
          </li>
        </ul>
      </div>

      <!-- 快捷操作 -->
      <div class="card action-card">
        <div class="action-buttons">
          <router-link to="/health" class="action-btn">
            <span>&#9997;&#65039;</span>
            <span>修改画像</span>
          </router-link>
          <router-link to="/health/daily/add" class="action-btn">
            <span>&#10133;</span>
            <span>记录今日</span>
          </router-link>
          <router-link to="/health/daily" class="action-btn">
            <span>&#128220;</span>
            <span>查看记录</span>
          </router-link>
        </div>
      </div>
    </template>
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

const suggestions = ref<string[]>([]);

const currentAge = computed(() => {
  if (!userStore.config) return 0;
  return new Date().getFullYear() - userStore.config.data.birthYear;
});

const gender = computed(() => {
  return userStore.config?.data.gender || 'male';
});

function getFactorIcon(name: string): string {
  const map: Record<string, string> = {
    '吸烟': '&#128684;',
    '饮酒': '&#127866;',
    '饮食结构': '&#129367;',
    '运动': '&#127939;',
    'BMI': '&#9878;&#65039;',
    '睡眠': '&#128164;',
    '压力': '&#129504;',
    '空气质量': '&#127758;',
    '慢性病': '&#127973;',
    '家族史': '&#128106;',
    '每日记录': '&#128197;',
  };
  return map[name] || '&#8226;';
}

function getBarWidth(days: number): number {
  const maxDays = 365 * 5; // 最大5年
  const absDays = Math.abs(days);
  return Math.min(100, (absDays / maxDays) * 100);
}

async function recalculate() {
  if (!userStore.isConfigured || !healthStore.hasProfile) return;
  result.value = healthStore.computeLifeExpectancy(currentAge.value, gender.value);
  suggestions.value = healthStore.getSuggestions(result.value);
  await healthStore.saveSnapshot(result.value);
}

onMounted(async () => {
  await userStore.loadConfig();
  userStore.checkConfigured();
  await healthStore.loadProfile();
  await healthStore.loadDailyRecords();
  await recalculate();
});

watch(() => healthStore.dailyRecords.length, recalculate);
</script>

<style scoped>
.health-result-page {
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

.setup-prompt h2 {
  font-size: 18px;
  margin-bottom: 8px;
}

.setup-prompt p {
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.result-card {
  text-align: center;
  padding: 24px;
  margin: 16px;
  background: linear-gradient(135deg, var(--primary) 0%, #6ba8e8 100%);
  color: white;
}

.result-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.result-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.result-value {
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
}

.result-unit {
  font-size: 20px;
  font-weight: 400;
}

.result-detail {
  font-size: 13px;
  opacity: 0.85;
  margin-top: 8px;
}

.factor-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.factor-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.factor-name {
  font-size: 13px;
  color: var(--text-secondary);
  width: 80px;
  flex-shrink: 0;
}

.factor-bar-wrapper {
  flex: 1;
  height: 8px;
  background: var(--bg);
  border-radius: 4px;
  overflow: hidden;
}

.factor-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.factor-bar.positive { background: var(--success, #52c41a); }
.factor-bar.negative { background: var(--danger, #ff4d4f); }

.factor-value {
  font-size: 13px;
  font-weight: 600;
  width: 60px;
  text-align: right;
  flex-shrink: 0;
}

.factor-value.positive { color: var(--success, #52c41a); }
.factor-value.negative { color: var(--danger, #ff4d4f); }

.suggestion-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.suggestion-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item::before {
  content: '&#8226;';
  color: var(--primary);
  margin-right: 8px;
}

.action-card {
  margin: 16px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-decoration: none;
  color: var(--text-primary);
  font-size: 13px;
  background: var(--card-bg);
}

.action-btn span:first-child {
  font-size: 24px;
}
</style>
