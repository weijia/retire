<template>
  <div class="expense-item">
    <div class="expense-left">
      <span class="expense-icon">{{ iconMap[record.data.category] || '💳' }}</span>
      <div class="expense-detail">
        <div class="expense-desc">{{ record.data.description }}</div>
        <div class="expense-meta">
          <span class="expense-category">{{ categoryLabel }}</span>
          <span class="expense-date">{{ relativeDate }}</span>
        </div>
      </div>
    </div>
    <div class="expense-amount">-{{ formatMoney(record.data.amount) }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ExpenseRecord } from '../types';
import { ExpenseRecordCategoryLabels } from '../types';
import { formatMoney, getRelativeDate } from '../utils/format';

const props = defineProps<{
  record: ExpenseRecord;
}>();

const categoryLabel = computed(() => ExpenseRecordCategoryLabels[props.record.data.category] || '其他');
const relativeDate = computed(() => getRelativeDate(props.record.data.date));

const iconMap: Record<string, string> = {
  supplementary_medical: '🏥',
  social_pension: '👴',
  medical_insurance: '💊',
  family_fixed: '🏠',
  personal_fixed: '👤',
  personal_flexible: '🎯',
  daily_food: '🍜',
  daily_transport: '🚌',
  daily_shopping: '🛒',
  daily_entertainment: '🎮',
  daily_housing: '🏡',
  daily_other: '💳',
};
</script>

<style scoped>
.expense-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.expense-item:last-child {
  border-bottom: none;
}

.expense-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.expense-icon {
  font-size: 22px;
  flex-shrink: 0;
}

.expense-detail {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.expense-desc {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expense-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--text-light);
}

.expense-amount {
  font-size: 15px;
  font-weight: 600;
  color: var(--danger);
  flex-shrink: 0;
  margin-left: 12px;
}
</style>
