<template>
  <div class="expenses-page">
    <div class="page-header">
      <h1>消费记录</h1>
      <div class="month-selector">
        <button class="month-btn" @click="changeMonth(-1)">‹</button>
        <span class="month-text">{{ monthLabel }}</span>
        <button class="month-btn" @click="changeMonth(1)">›</button>
      </div>
    </div>

    <!-- 月度汇总 -->
    <div class="card summary-card">
      <div class="summary-row">
        <span>本月支出</span>
        <span class="summary-amount amount-negative">{{ formatMoney(monthTotal) }}</span>
      </div>
      <div class="summary-row">
        <span>消费笔数</span>
        <span class="summary-amount">{{ monthRecords.length }} 笔</span>
      </div>
      <div class="summary-row">
        <span>日均支出</span>
        <span class="summary-amount">{{ formatMoney(dailyAverage) }}</span>
      </div>
    </div>

    <div v-if="expensesStore.loading" class="empty-state">加载中...</div>

    <div v-else-if="monthRecords.length === 0" class="empty-state">
      <div class="icon">📝</div>
      <p>{{ monthLabel }}暂无消费记录</p>
      <p>点击下方 + 记录一笔消费</p>
    </div>

    <template v-else>
      <!-- 按日期分组 -->
      <div v-for="(records, date) in groupedByDate" :key="date" class="date-group">
        <div class="group-title">
          <span>{{ formatDateCN(date) }}</span>
          <span>{{ formatMoney(dateTotal(date)) }}</span>
        </div>
        <div class="card group-card">
          <ExpenseItem
            v-for="record in records"
            :key="record._id"
            :record="record"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useExpensesStore } from '../stores/expenses';
import { formatMoney, formatDateCN } from '../utils/format';

const expensesStore = useExpensesStore();

// 当前选择的月份
const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(now.getMonth() + 1);

const monthLabel = computed(() => `${selectedYear.value}年${selectedMonth.value}月`);

const monthRecords = computed(() =>
  expensesStore.records.filter(r => {
    const d = new Date(r.data.date);
    return d.getFullYear() === selectedYear.value && d.getMonth() + 1 === selectedMonth.value;
  })
);

const monthTotal = computed(() =>
  monthRecords.value.reduce((sum, r) => sum + r.data.amount, 0)
);

const dailyAverage = computed(() => {
  const daysInMonth = new Date(selectedYear.value, selectedMonth.value, 0).getDate();
  const today = new Date();
  let daysPassed = daysInMonth;
  if (selectedYear.value === today.getFullYear() && selectedMonth.value === today.getMonth() + 1) {
    daysPassed = today.getDate();
  }
  return daysPassed > 0 ? monthTotal.value / daysPassed : 0;
});

const groupedByDate = computed(() => {
  const groups: Record<string, any[]> = {};
  monthRecords.value.forEach(r => {
    if (!groups[r.data.date]) groups[r.data.date] = [];
    groups[r.data.date].push(r);
  });
  // 按日期降序排列
  const sorted: Record<string, any[]> = {};
  Object.keys(groups).sort().reverse().forEach(key => {
    sorted[key] = groups[key];
  });
  return sorted;
});

function dateTotal(date: string): number {
  return (groupedByDate.value[date] || []).reduce((sum, r) => sum + r.data.amount, 0);
}

function changeMonth(delta: number) {
  selectedMonth.value += delta;
  if (selectedMonth.value > 12) {
    selectedMonth.value = 1;
    selectedYear.value++;
  } else if (selectedMonth.value < 1) {
    selectedMonth.value = 12;
    selectedYear.value--;
  }
}

onMounted(() => {
  expensesStore.loadRecords();
});
</script>

<style scoped>
.month-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.month-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--primary);
  cursor: pointer;
  padding: 2px 6px;
}

.month-text {
  font-size: 15px;
  font-weight: 600;
  min-width: 80px;
  text-align: center;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.summary-amount {
  font-weight: 600;
}

.group-card {
  margin-top: 0;
}
</style>
