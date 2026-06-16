<template>
  <div class="health-daily-form-page">
    <div class="page-header">
      <button class="back-btn" @click="$router.back()">&#8249; 返回</button>
      <h1>记录健康行为</h1>
      <span></span>
    </div>

    <div class="card">
      <div class="form-group">
        <label class="form-label">记录类别</label>
        <div class="category-grid">
          <div
            v-for="cat in categories"
            :key="cat.value"
            class="category-item"
            :class="{ active: form.category === cat.value }"
            @click="form.category = cat.value as DailyCat"
          >
            <span class="category-icon">{{ cat.icon }}</span>
            <span class="category-label">{{ cat.label }}</span>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">描述</label>
        <input
          v-model="form.description"
          type="text"
          class="form-input"
          :placeholder="descriptionPlaceholder"
        />
      </div>

      <div class="form-group">
        <label class="form-label">日期</label>
        <input v-model="form.date" type="date" class="form-input" />
      </div>

      <div class="form-group">
        <label class="form-label">
          数量
          <span class="form-hint">{{ quantityHint }}</span>
        </label>
        <input v-model.number="form.quantity" type="number" class="form-input" min="0" />
      </div>

      <div class="impact-preview">
        <span>预计影响:</span>
        <span :class="previewImpact >= 0 ? 'positive' : 'negative'">
          {{ previewImpact >= 0 ? '+' : '' }}{{ previewImpact.toFixed(2) }}天
        </span>
      </div>

      <button class="btn btn-primary btn-block" @click="save" :disabled="saving">
        {{ saving ? '保存中...' : '保存记录' }}
      </button>
    </div>

    <!-- 快速记录模板 -->
    <div class="card">
      <div class="card-title">&#9889; 快速记录</div>
      <div class="quick-actions">
        <button
          v-for="action in quickActions"
          :key="action.label"
          class="quick-btn"
          @click="applyQuickAction(action)"
        >
          <span>{{ action.icon }}</span>
          <span>{{ action.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useHealthStore } from '../stores/health';
import { calculateRecordImpact } from '../utils/lifeExpectancy';

const router = useRouter();
const healthStore = useHealthStore();
const saving = ref(false);

const categories = [
  { value: 'exercise', label: '运动', icon: '&#127939;' },
  { value: 'smoking', label: '吸烟', icon: '&#128684;' },
  { value: 'alcohol', label: '饮酒', icon: '&#127866;' },
  { value: 'high_calorie', label: '高热量', icon: '&#127828;' },
  { value: 'junk_food', label: '垃圾食品', icon: '&#127839;' },
  { value: 'diet', label: '饮食', icon: '&#129367;' },
  { value: 'sleep', label: '睡眠', icon: '&#128164;' },
  { value: 'other', label: '其他', icon: '&#128221;' },
];

const quickActions = [
  { icon: '&#127939;', label: '跑步30分钟', category: 'exercise', description: '跑步30分钟', quantity: 30 },
  { icon: '&#127939;', label: '游泳45分钟', category: 'exercise', description: '游泳45分钟', quantity: 45 },
  { icon: '&#127939;', label: '散步60分钟', category: 'exercise', description: '散步60分钟', quantity: 60 },
  { icon: '&#128684;', label: '抽了5根烟', category: 'smoking', description: '抽了5根烟', quantity: 5 },
  { icon: '&#128684;', label: '抽了1包烟', category: 'smoking', description: '抽了1包烟', quantity: 20 },
  { icon: '&#127866;', label: '喝了2杯酒', category: 'alcohol', description: '喝了2杯酒', quantity: 2 },
  { icon: '&#127828;', label: '吃了炸鸡', category: 'high_calorie', description: '吃了炸鸡', quantity: 1 },
  { icon: '&#127839;', label: '吃了薯条', category: 'junk_food', description: '吃了薯条', quantity: 1 },
  { icon: '&#128164;', label: '睡了8小时', category: 'sleep', description: '睡了8小时', quantity: 8 },
  { icon: '&#128164;', label: '只睡5小时', category: 'sleep', description: '只睡5小时', quantity: 5 },
];

type DailyCat = 'exercise' | 'smoking' | 'alcohol' | 'high_calorie' | 'junk_food' | 'diet' | 'sleep' | 'other';

const form = ref({
  category: 'exercise' as DailyCat,
  description: '',
  date: new Date().toISOString().slice(0, 10),
  quantity: 30,
});

const descriptionPlaceholder = computed(() => {
  const map: Record<string, string> = {
    exercise: '如：跑步30分钟',
    smoking: '如：抽了5根烟',
    alcohol: '如：喝了2杯啤酒',
    high_calorie: '如：吃了炸鸡',
    junk_food: '如：吃了薯条',
    diet: '如：吃了沙拉',
    sleep: '如：睡了7小时',
    other: '如：其他健康行为',
  };
  return map[form.value.category] || '请输入描述';
});

const quantityHint = computed(() => {
  const map: Record<string, string> = {
    exercise: '分钟',
    smoking: '根',
    alcohol: '杯',
    high_calorie: '次',
    junk_food: '次',
    diet: '次',
    sleep: '小时',
    other: '单位',
  };
  return map[form.value.category] || '';
});

const previewImpact = computed(() => {
  return calculateRecordImpact(form.value.category, form.value.quantity);
});

function applyQuickAction(action: typeof quickActions[0]) {
  form.value.category = action.category as DailyCat;
  form.value.description = action.description;
  form.value.quantity = action.quantity;
}

async function save() {
  if (!form.value.description.trim()) {
    alert('请输入描述');
    return;
  }

  saving.value = true;
  try {
    const impact = calculateRecordImpact(form.value.category, form.value.quantity);
    await healthStore.addDailyRecord({
      date: form.value.date,
      category: form.value.category,
      description: form.value.description,
      impact,
      quantity: form.value.quantity,
    });
    router.back();
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.health-daily-form-page {
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

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
  background: var(--card-bg);
}

.category-item.active {
  border-color: var(--primary);
  background: rgba(74, 144, 217, 0.1);
}

.category-icon {
  font-size: 24px;
}

.category-label {
  font-size: 12px;
  color: var(--text-secondary);
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

.form-hint {
  color: var(--text-light);
  font-size: 12px;
  margin-left: 4px;
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

.impact-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg);
  border-radius: var(--radius);
  margin-bottom: 16px;
  font-size: 14px;
}

.impact-preview .positive { color: var(--success, #52c41a); font-weight: 600; }
.impact-preview .negative { color: var(--danger, #ff4d4f); font-weight: 600; }

.btn-block {
  margin: 0;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card-bg);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
}

.quick-btn:active {
  background: var(--bg);
}

.quick-btn span:first-child {
  font-size: 18px;
}
</style>
