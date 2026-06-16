<template>
  <div class="health-profile-page">
    <div class="page-header">
      <button class="back-btn" @click="$router.back()">&#8249; 返回</button>
      <h1>健康画像</h1>
      <span></span>
    </div>

    <div class="card">
      <div class="card-title">&#128684; 吸烟情况</div>
      <div class="form-group">
        <div class="radio-group">
          <label class="radio-item" :class="{ active: form.smokingStatus === 'never' }">
            <input type="radio" v-model="form.smokingStatus" value="never" />
            <span>从不吸烟</span>
          </label>
          <label class="radio-item" :class="{ active: form.smokingStatus === 'former' }">
            <input type="radio" v-model="form.smokingStatus" value="former" />
            <span>已戒烟</span>
          </label>
          <label class="radio-item" :class="{ active: form.smokingStatus === 'current' }">
            <input type="radio" v-model="form.smokingStatus" value="current" />
            <span>当前吸烟</span>
          </label>
        </div>
      </div>
      <div v-if="form.smokingStatus === 'current'" class="form-row">
        <div class="form-group half">
          <label class="form-label">每日支数</label>
          <input v-model.number="form.cigarettesPerDay" type="number" class="form-input" min="0" max="100" />
        </div>
        <div class="form-group half">
          <label class="form-label">烟龄（年）</label>
          <input v-model.number="form.smokingYears" type="number" class="form-input" min="0" max="80" />
        </div>
      </div>
      <div v-if="form.smokingStatus === 'former'" class="form-row">
        <div class="form-group half">
          <label class="form-label">烟龄（年）</label>
          <input v-model.number="form.smokingYears" type="number" class="form-input" min="0" max="80" />
        </div>
        <div class="form-group half">
          <label class="form-label">戒烟年数</label>
          <input v-model.number="form.quitSmokingYears" type="number" class="form-input" min="0" max="80" />
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">&#127866; 饮酒情况</div>
      <div class="form-group">
        <div class="radio-group">
          <label class="radio-item" :class="{ active: form.drinkingStatus === 'never' }">
            <input type="radio" v-model="form.drinkingStatus" value="never" />
            <span>从不</span>
          </label>
          <label class="radio-item" :class="{ active: form.drinkingStatus === 'occasional' }">
            <input type="radio" v-model="form.drinkingStatus" value="occasional" />
            <span>偶尔</span>
          </label>
          <label class="radio-item" :class="{ active: form.drinkingStatus === 'regular' }">
            <input type="radio" v-model="form.drinkingStatus" value="regular" />
            <span>经常</span>
          </label>
          <label class="radio-item" :class="{ active: form.drinkingStatus === 'heavy' }">
            <input type="radio" v-model="form.drinkingStatus" value="heavy" />
            <span>大量</span>
          </label>
        </div>
      </div>
      <div v-if="form.drinkingStatus !== 'never'" class="form-group">
        <label class="form-label">每周饮酒杯数（约150ml/杯）</label>
        <input v-model.number="form.drinksPerWeek" type="number" class="form-input" min="0" max="100" />
      </div>
    </div>

    <div class="card">
      <div class="card-title">&#129367; 饮食结构</div>
      <div class="form-group">
        <label class="form-label">整体饮食模式</label>
        <div class="radio-group">
          <label class="radio-item" :class="{ active: form.dietPattern === 'healthy' }">
            <input type="radio" v-model="form.dietPattern" value="healthy" />
            <span>健康</span>
          </label>
          <label class="radio-item" :class="{ active: form.dietPattern === 'average' }">
            <input type="radio" v-model="form.dietPattern" value="average" />
            <span>一般</span>
          </label>
          <label class="radio-item" :class="{ active: form.dietPattern === 'unhealthy' }">
            <input type="radio" v-model="form.dietPattern" value="unhealthy" />
            <span>不健康</span>
          </label>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group half">
          <label class="form-label">蔬果份数/天</label>
          <input v-model.number="form.fruitVegServingsPerDay" type="number" class="form-input" min="0" max="20" />
        </div>
        <div class="form-group half">
          <label class="form-label">红肉次数/周</label>
          <input v-model.number="form.redMeatFreqPerWeek" type="number" class="form-input" min="0" max="30" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group half">
          <label class="form-label">加工食品/周</label>
          <input v-model.number="form.processedFoodFreqPerWeek" type="number" class="form-input" min="0" max="30" />
        </div>
        <div class="form-group half">
          <label class="form-label">含糖饮料/周</label>
          <input v-model.number="form.sugarDrinkFreqPerWeek" type="number" class="form-input" min="0" max="30" />
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">&#127939; 身体活动</div>
      <div class="form-row">
        <div class="form-group half">
          <label class="form-label">运动次数/周</label>
          <input v-model.number="form.exerciseFreqPerWeek" type="number" class="form-input" min="0" max="14" />
        </div>
        <div class="form-group half">
          <label class="form-label">每次时长（分钟）</label>
          <input v-model.number="form.exerciseMinutesPerSession" type="number" class="form-input" min="0" max="300" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">每日久坐时长（小时）</label>
        <input v-model.number="form.sedentaryHoursPerDay" type="number" class="form-input" min="0" max="24" />
      </div>
    </div>

    <div class="card">
      <div class="card-title">&#9878;&#65039; 身体指标</div>
      <div class="form-row">
        <div class="form-group half">
          <label class="form-label">身高（cm）</label>
          <input v-model.number="form.height" type="number" class="form-input" min="100" max="250" />
        </div>
        <div class="form-group half">
          <label class="form-label">体重（kg）</label>
          <input v-model.number="form.weight" type="number" class="form-input" min="30" max="300" />
        </div>
      </div>
      <div v-if="bmi > 0" class="bmi-display">
        BMI: <strong>{{ bmi.toFixed(1) }}</strong>
        <span :class="bmiClass">{{ bmiLabel }}</span>
      </div>
    </div>

    <div class="card">
      <div class="card-title">&#128164; 睡眠</div>
      <div class="form-group">
        <label class="form-label">每日睡眠时长（小时）</label>
        <input v-model.number="form.sleepHoursPerDay" type="number" class="form-input" min="0" max="24" step="0.5" />
      </div>
    </div>

    <div class="card">
      <div class="card-title">&#129504; 心理与环境</div>
      <div class="form-group">
        <label class="form-label">压力水平（1-10，10最高）</label>
        <input v-model.number="form.stressLevel" type="range" class="form-range" min="1" max="10" />
        <div class="range-labels">
          <span>轻松</span>
          <span class="range-value">{{ form.stressLevel }}</span>
          <span>高压</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">居住地空气质量</label>
        <div class="radio-group">
          <label class="radio-item" :class="{ active: form.airQuality === 'good' }">
            <input type="radio" v-model="form.airQuality" value="good" />
            <span>良好</span>
          </label>
          <label class="radio-item" :class="{ active: form.airQuality === 'moderate' }">
            <input type="radio" v-model="form.airQuality" value="moderate" />
            <span>一般</span>
          </label>
          <label class="radio-item" :class="{ active: form.airQuality === 'poor' }">
            <input type="radio" v-model="form.airQuality" value="poor" />
            <span>较差</span>
          </label>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">&#127973; 慢性病史</div>
      <div class="checkbox-group">
        <label class="checkbox-item">
          <input type="checkbox" v-model="form.hasDiabetes" />
          <span>糖尿病</span>
        </label>
        <label class="checkbox-item">
          <input type="checkbox" v-model="form.hasHypertension" />
          <span>高血压</span>
        </label>
        <label class="checkbox-item">
          <input type="checkbox" v-model="form.hasHeartDisease" />
          <span>心脏病</span>
        </label>
        <label class="checkbox-item">
          <input type="checkbox" v-model="form.hasStroke" />
          <span>中风</span>
        </label>
        <label class="checkbox-item">
          <input type="checkbox" v-model="form.hasCancer" />
          <span>癌症</span>
        </label>
      </div>
    </div>

    <div class="card">
      <div class="card-title">&#128106; 家族史</div>
      <div class="checkbox-group">
        <label class="checkbox-item">
          <input type="checkbox" v-model="form.familyHistoryLongevity" />
          <span>直系亲属有长寿（&gt;85岁）</span>
        </label>
        <label class="checkbox-item">
          <input type="checkbox" v-model="form.familyHistoryHeartDisease" />
          <span>家族心脏病史</span>
        </label>
        <label class="checkbox-item">
          <input type="checkbox" v-model="form.familyHistoryCancer" />
          <span>家族癌症史</span>
        </label>
      </div>
    </div>

    <button class="btn btn-primary btn-block" @click="save" :disabled="saving">
      {{ saving ? '保存中...' : '保存健康画像' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useHealthStore } from '../stores/health';

const router = useRouter();
const healthStore = useHealthStore();
const saving = ref(false);

const form = ref({
  smokingStatus: 'never' as 'never' | 'former' | 'current',
  cigarettesPerDay: 0,
  smokingYears: 0,
  quitSmokingYears: 0,
  drinkingStatus: 'never' as 'never' | 'occasional' | 'regular' | 'heavy',
  drinksPerWeek: 0,
  dietPattern: 'average' as 'healthy' | 'average' | 'unhealthy',
  fruitVegServingsPerDay: 3,
  redMeatFreqPerWeek: 3,
  processedFoodFreqPerWeek: 2,
  sugarDrinkFreqPerWeek: 1,
  exerciseFreqPerWeek: 2,
  exerciseMinutesPerSession: 30,
  sedentaryHoursPerDay: 6,
  height: 170,
  weight: 65,
  sleepHoursPerDay: 7,
  stressLevel: 5,
  airQuality: 'moderate' as 'good' | 'moderate' | 'poor',
  hasDiabetes: false,
  hasHypertension: false,
  hasHeartDisease: false,
  hasStroke: false,
  hasCancer: false,
  familyHistoryLongevity: false,
  familyHistoryHeartDisease: false,
  familyHistoryCancer: false,
});

const bmi = computed(() => {
  if (!form.value.height || !form.value.weight) return 0;
  return form.value.weight / Math.pow(form.value.height / 100, 2);
});

const bmiClass = computed(() => {
  const v = bmi.value;
  if (v < 18.5) return 'bmi-under';
  if (v <= 24.9) return 'bmi-normal';
  if (v <= 29.9) return 'bmi-over';
  return 'bmi-obese';
});

const bmiLabel = computed(() => {
  const v = bmi.value;
  if (v < 18.5) return '偏瘦';
  if (v <= 24.9) return '正常';
  if (v <= 29.9) return '超重';
  return '肥胖';
});

onMounted(async () => {
  await healthStore.loadProfile();
  if (healthStore.profile) {
    const d = healthStore.profile.data;
    form.value = {
      smokingStatus: d.smokingStatus,
      cigarettesPerDay: d.cigarettesPerDay || 0,
      smokingYears: d.smokingYears || 0,
      quitSmokingYears: d.quitSmokingYears || 0,
      drinkingStatus: d.drinkingStatus,
      drinksPerWeek: d.drinksPerWeek || 0,
      dietPattern: d.dietPattern,
      fruitVegServingsPerDay: d.fruitVegServingsPerDay,
      redMeatFreqPerWeek: d.redMeatFreqPerWeek,
      processedFoodFreqPerWeek: d.processedFoodFreqPerWeek,
      sugarDrinkFreqPerWeek: d.sugarDrinkFreqPerWeek,
      exerciseFreqPerWeek: d.exerciseFreqPerWeek,
      exerciseMinutesPerSession: d.exerciseMinutesPerSession,
      sedentaryHoursPerDay: d.sedentaryHoursPerDay,
      height: d.height,
      weight: d.weight,
      sleepHoursPerDay: d.sleepHoursPerDay,
      stressLevel: d.stressLevel,
      airQuality: d.airQuality,
      hasDiabetes: d.hasDiabetes,
      hasHypertension: d.hasHypertension,
      hasHeartDisease: d.hasHeartDisease,
      hasStroke: d.hasStroke,
      hasCancer: d.hasCancer,
      familyHistoryLongevity: d.familyHistoryLongevity,
      familyHistoryHeartDisease: d.familyHistoryHeartDisease,
      familyHistoryCancer: d.familyHistoryCancer,
    };
  }
});

async function save() {
  saving.value = true;
  try {
    await healthStore.saveProfile(form.value);
    router.push('/health/result');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.health-profile-page {
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

.card {
  margin: 12px 16px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.form-group {
  margin-bottom: 12px;
}

.form-group.half {
  flex: 1;
}

.form-row {
  display: flex;
  gap: 12px;
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

.form-range {
  width: 100%;
  margin: 8px 0;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-light);
}

.range-value {
  font-weight: 600;
  color: var(--primary);
}

.radio-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.radio-item {
  flex: 1;
  min-width: 60px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-align: center;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--card-bg);
}

.radio-item input {
  display: none;
}

.radio-item.active {
  border-color: var(--primary);
  background: rgba(74, 144, 217, 0.1);
  color: var(--primary);
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.bmi-display {
  padding: 10px;
  background: var(--bg);
  border-radius: var(--radius);
  font-size: 14px;
  text-align: center;
}

.bmi-display span {
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.bmi-under { background: #e6f7ff; color: #1890ff; }
.bmi-normal { background: #f6ffed; color: #52c41a; }
.bmi-over { background: #fff7e6; color: #fa8c16; }
.bmi-obese { background: #fff1f0; color: #f5222d; }

.btn-block {
  margin: 16px;
}
</style>
