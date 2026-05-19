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
        <!-- 目标退休年龄调节 -->
        <div class="age-adjust" v-if="showAgeAdjust">
          <div class="age-adjust-control">
            <button class="age-btn" @click="$emit('adjustAge', -1)" :disabled="targetAge <= minAge">−</button>
            <span class="age-value">{{ targetAge }} 岁</span>
            <button class="age-btn" @click="$emit('adjustAge', 1)" :disabled="targetAge >= maxAge">+</button>
          </div>
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
  showAgeAdjust?: boolean;
  minAge?: number;
  maxAge?: number;
}>(), {
  label: '目标退休日',
  compact: false,
  showAgeAdjust: false,
  minAge: 40,
  maxAge: 70,
});

const emit = defineEmits<{
  adjustAge: [delta: number];
}>();

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

/* 目标退休年龄调节 */
.age-adjust {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.age-adjust-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.age-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.25);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.age-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.4);
}

.age-btn:disabled {
  background: rgba(255, 255, 255, 0.1);
  cursor: not-allowed;
  opacity: 0.5;
}

.age-value {
  font-size: 13px;
  font-weight: 500;
  min-width: 50px;
  text-align: center;
}
</style>
