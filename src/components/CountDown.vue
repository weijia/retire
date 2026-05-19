<template>
  <div class="countdown-card">
    <div class="countdown-days">
      <span class="days-number">{{ days }}</span>
      <span class="days-label">天</span>
    </div>
    <div class="countdown-info">
      <div class="retire-date">{{ label }}：{{ retireDateStr }}</div>
      <div class="countdown-detail" v-if="years > 0 || months > 0">
        约 {{ years }} 年 {{ months }} 个月
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { calcDaysToRetire, calcYearsMonthsToRetire, calcRetireDate } from '../utils/calc';

const props = withDefaults(defineProps<{
  birthDate: string;
  targetAge: number;
  label?: string;
}>(), {
  label: '目标退休日',
});

const days = computed(() => calcDaysToRetire(props.birthDate, props.targetAge));
const { years, months } = computed(() => calcYearsMonthsToRetire(props.birthDate, props.targetAge)).value;
const retireDateStr = computed(() => {
  const d = calcRetireDate(props.birthDate, props.targetAge);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
});
</script>

<style scoped>
.countdown-card {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  border-radius: var(--radius);
  padding: 24px;
  text-align: center;
}

.countdown-days {
  margin-bottom: 8px;
}

.days-number {
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
}

.days-label {
  font-size: 16px;
  margin-left: 4px;
}

.countdown-info {
  font-size: 13px;
  opacity: 0.9;
}

.retire-date {
  margin-bottom: 4px;
}
</style>
