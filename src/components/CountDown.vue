<template>
  <div class="countdown-card" :class="{ compact: isCompact }">
    <div class="countdown-content">
      <div class="countdown-days">
        <span class="days-number">{{ days }}</span>
        <span class="days-label">天</span>
      </div>
      <div class="countdown-info">
        <div class="retire-date">{{ label }}：{{ retireYear }}年</div>
        <div class="countdown-detail" v-if="years > 0">
          约 {{ years }} 年
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { calcDaysToRetire, calcYearsToRetire, calcRetireYear } from '../utils/calc';

const props = withDefaults(defineProps<{
  birthYear: number;
  targetAge: number;
  label?: string;
  compact?: boolean;
}>(), {
  label: '目标退休日',
  compact: false,
});

const isCompact = computed(() => props.compact);
const days = computed(() => calcDaysToRetire(props.birthYear, props.targetAge));
const years = computed(() => calcYearsToRetire(props.birthYear, props.targetAge));
const retireYear = computed(() => calcRetireYear(props.birthYear, props.targetAge));
</script>

<style scoped>
.countdown-card {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  border-radius: var(--radius);
  padding: 24px;
  text-align: center;
}

.countdown-card.compact {
  padding: 12px 16px;
}

.countdown-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.countdown-card.compact .countdown-content {
  gap: 12px;
}

.countdown-days {
  display: flex;
  align-items: baseline;
}

.days-number {
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
}

.countdown-card.compact .days-number {
  font-size: 28px;
}

.days-label {
  font-size: 16px;
  margin-left: 4px;
}

.countdown-card.compact .days-label {
  font-size: 14px;
}

.countdown-info {
  font-size: 13px;
  opacity: 0.9;
  text-align: left;
}

.countdown-card.compact .countdown-info {
  font-size: 12px;
}

.retire-date {
  margin-bottom: 2px;
}
</style>
