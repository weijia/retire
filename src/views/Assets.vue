<template>
  <div class="assets-page">
    <div class="page-header">
      <h1>资产管理</h1>
      <router-link to="/settings" class="header-btn">⚙️</router-link>
    </div>

    <!-- 总资产 -->
    <div class="total-section">
      <div class="total-label">总资产</div>
      <div class="total-amount">{{ formatMoney(assetsStore.totalAssets) }}</div>
    </div>

    <!-- 按类型分组 -->
    <div v-if="assetsStore.loading" class="empty-state">加载中...</div>

    <div v-else-if="Object.keys(assetsStore.accountsByType).length === 0" class="empty-state">
      <div class="icon">💰</div>
      <p>暂无资产记录</p>
      <p>点击下方 + 添加您的第一个资产账户</p>
    </div>

    <template v-else>
      <div
        v-for="(accounts, type) in assetsStore.accountsByType"
        :key="type"
        class="type-group"
      >
        <div class="group-title">
          <span>{{ iconMap[type as string] || '💳' }} {{ AccountTypeLabels[type as keyof typeof AccountTypeLabels] }}</span>
          <span>{{ formatMoney(typeTotal(type as string)) }}</span>
        </div>
        <div class="card group-card">
          <AssetCard
            v-for="account in accounts"
            :key="account._id"
            :account="account"
            @click="editAccount(account._id)"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAssetsStore } from '../stores/assets';
import { formatMoney } from '../utils/format';
import { AccountTypeLabels } from '../types';
import AssetCard from '../components/AssetCard.vue';

const router = useRouter();
const assetsStore = useAssetsStore();

const iconMap: Record<string, string> = {
  alipay: '💙',
  bank_deposit: '🏦',
  fund: '📈',
  stock: '📊',
  pension: '👴',
  other: '💳',
};

function typeTotal(type: string): number {
  return (assetsStore.accountsByType as Record<string, any[]>)[type]
    ?.reduce((sum: number, a: any) => sum + a.data.balance, 0) || 0;
}

function editAccount(id: string) {
  router.push(`/assets/edit/${id}`);
}

onMounted(() => {
  assetsStore.loadAccounts();
});
</script>

<style scoped>
.total-section {
  text-align: center;
  padding: 24px 16px;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
}

.total-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.total-amount {
  font-size: 32px;
  font-weight: 700;
}

.type-group {
  margin-top: 8px;
}

.group-card {
  margin-top: 0;
}

.header-btn {
  font-size: 20px;
  text-decoration: none;
}
</style>
