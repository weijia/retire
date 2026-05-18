<template>
  <div class="progress-ring">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
      <circle
        class="ring-bg"
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke-width="strokeWidth"
      />
      <circle
        class="ring-fill"
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke-width="strokeWidth"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        :stroke="color"
      />
    </svg>
    <div class="ring-text">
      <span class="ring-percent">{{ percent }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}>(), {
  size: 80,
  strokeWidth: 6,
  color: 'var(--primary)',
});

const center = computed(() => props.size / 2);
const radius = computed(() => (props.size - props.strokeWidth) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const dashOffset = computed(() => {
  const clampedPercent = Math.min(100, Math.max(0, props.percent));
  return circumference.value - (clampedPercent / 100) * circumference.value;
});
</script>

<style scoped>
.progress-ring {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ring-bg {
  fill: none;
  stroke: #E8E8E8;
}

.ring-fill {
  fill: none;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dashoffset 0.5s ease;
}

.ring-text {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring-percent {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
</style>
