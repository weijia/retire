<template>
  <div class="health-daily-page">
    <div class="page-header">
      <button class="back-btn" @click="$router.back()">&#8249; 返回</button>
      <h1>每日健康记录</h1>
      <router-link to="/health/daily/add" class="add-btn">+ 添加</router-link>
    </div>

    <!-- 本周概览 -->
    <div class="card week-summary">
      <div class="card-title">📊 本周影响概览</div>
      <div class="week-stats">
        <div class="week-stat" v-for="stat in weekStats" :key="stat.category">
          <span class="stat-icon">{{ stat.icon }}</span>
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-value" :class="stat.value >= 0 ? 'positive' : 'negative'">
            {{ stat.value >= 0 ? '+' : '' }}{{ stat.value.toFixed(1) }}天
          </span>
        </div>
      </div>
      <div class="week-total" :class="healthStore.weekNetImpact >= 0 ? 'positive' : 'negative'">
        本周净影响: {{ healthStore.weekNetImpact >= 0 ? '+' : '' }}{{ healthStore.weekNetImpact.toFixed(1) }}天
        {{ healthStore.weekNetImpact >= 0 ? '🟢' : '🔴' }}
      </div>
    </div>

    <!-- 记录列表 -->
    <div v-if="healthStore.recordsByDate.length === 0" class="card empty-hint">
      暂无健康记录，点击右上角添加
    </div>

    <div v-for="group in healthStore.recordsByDate" :key="group.date" class="card record-group">
      <div class="record-date">
        {{ formatDate(group.date) }}
        <span v-if="isToday(group.date)" class="today-tag">今天</span>
      </div>
      <div class="record-list">
        <div v-for="record in group.records" :key="record._id" class="record-item">
          <span class="record-icon">{{ getCategoryIcon(record.data.category) }}</span>
          <div class="record-info">
            <div class="record-desc">{{ record.data.description }}</div>
            <div v-if="record.data.quantity" class="record-quantity">数量: {{ record.data.quantity }}</div>
          </div>
          <span class="record-impact" :class="record.data.impact >= 0 ? 'positive' : 'negative'">
            {{ record.data.impact >= 0 ? '+' : '' }}{{ record.data.impact.toFixed(2) }}天
          </span>
          <button class="record-delete" @click="deleteRecord(record._id)">&#215;</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useHealthStore } from '../stores/health';
import { DailyRecordCategoryIcons, DailyRecordCategoryLabels } from '../types';

const healthStore = useHealthStore();

const weekStats = computed(() => {
  const categories = ['exercise', 'smoking', 'diet', 'sleep', 'alcohol', 'high_calorie', 'junk_food'] as const;
  return categories.map(cat => {
    const records = healthStore.weekRecords.filter(r => r.data.category === cat);
    const total = records.reduce((sum, r) => sum + r.data.impact, 0);
    return {
      category: cat,
      icon: DailyRecordCategoryIcons[cat],
      label: DailyRecordCategoryLabels[cat],
      value: total,
    };
  }).filter(s => s.value !== 0);
});

function getCategoryIcon(category: string): string {
  return DailyRecordCategoryIcons[category as keyof typeof DailyRecordCategoryIcons] || '📝';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);

  if (d.toDateString() === today.toDateString()) return '今天';
  if (d.toDateString() === yesterday.toDateString()) return '昨天';

  return `${d.getMonth() + 1}月${d.getDate()}日 ${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]}`;
}

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

async function deleteRecord(id: string) {
  if (!confirm('确定删除这条记录吗？')) return;
  await healthStore.removeDailyRecord(id);
}

onMounted(async () => {
  await healthStore.loadDailyRecords();
});
</script>

<style scoped>
.health-daily-page {
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

.add-btn {
  font-size: 14px;
  color: var(--primary);
  text-decoration: none;
  padding: 6px 12px;
  border: 1px solid var(--primary);
  border-radius: var(--radius);
}

.week-summary {
  margin: 12px 16px;
}

.week-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.week-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: var(--bg);
  border-radius: var(--radius);
  font-size: 13px;
}

.stat-icon {
  font-size: 16px;
}

.stat-label {
  flex: 1;
  color: var(--text-secondary);
}

.stat-value {
  font-weight: 600;
}

.stat-value.positive { color: var(--success, #52c41a); }
.stat-value.negative { color: var(--danger, #ff4d4f); }

.week-total {
  text-align: center;
  padding: 10px;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 600;
}

.week-total.positive { background: rgba(82, 196, 26, 0.1); color: var(--success, #52c41a); }
.week-total.negative { background: rgba(255, 77, 79, 0.1); color: var(--danger, #ff4d4f); }

.record-group {
  margin: 8px 16px;
}

.record-date {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.today-tag {
  font-size: 11px;
  padding: 2px 6px;
  background: var(--primary);
  color: white;
  border-radius: 4px;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: var(--bg);
  border-radius: var(--radius);
}

.record-icon {
  font-size: 20px;
}

.record-info {
  flex: 1;
}

.record-desc {
  font-size: 14px;
  color: var(--text-primary);
}

.record-quantity {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 2px;
}

.record-impact {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.record-impact.positive { color: var(--success, #52c41a); }
.record-impact.negative { color: var(--danger, #ff4d4f); }

.record-delete {
  background: none;
  border: none;
  color: var(--text-light);
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
}

.empty-hint {
  text-align: center;
  padding: 32px;
  color: var(--text-light);
}
</style>
