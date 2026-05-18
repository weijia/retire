<template>
  <div class="asset-card" @click="$emit('click')">
    <div class="asset-info">
      <span class="asset-icon">{{ iconMap[account.data.accountType] || '💳' }}</span>
      <div class="asset-detail">
        <div class="asset-name">{{ account.data.name }}</div>
        <div class="asset-type">{{ typeLabel }}</div>
      </div>
    </div>
    <div class="asset-balance">{{ formatMoney(account.data.balance) }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AssetAccount } from '../types';
import { AccountTypeLabels } from '../types';
import { formatMoney } from '../utils/format';

const props = defineProps<{
  account: AssetAccount;
}>();

defineEmits(['click']);

const typeLabel = computed(() => AccountTypeLabels[props.account.data.accountType] || '其他');

const iconMap: Record<string, string> = {
  alipay: '💙',
  bank_deposit: '🏦',
  fund: '📈',
  stock: '📊',
  pension: '👴',
  other: '💳',
};
</script>

<style scoped>
.asset-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.asset-card:last-child {
  border-bottom: none;
}

.asset-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.asset-icon {
  font-size: 24px;
}

.asset-detail {
  display: flex;
  flex-direction: column;
}

.asset-name {
  font-size: 14px;
  font-weight: 500;
}

.asset-type {
  font-size: 12px;
  color: var(--text-light);
}

.asset-balance {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
</style>
