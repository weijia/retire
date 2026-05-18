import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AssetAccount } from '../types';
import { BaseService } from '../db/base';

const assetService = new BaseService<AssetAccount>('asset_account', 'asset');

export const useAssetsStore = defineStore('assets', () => {
  const accounts = ref<AssetAccount[]>([]);
  const loading = ref(false);

  // 可见资产列表
  const visibleAccounts = computed(() => accounts.value.filter(a => !a.data.isHidden));

  // 总资产
  const totalAssets = computed(() =>
    visibleAccounts.value.reduce((sum, a) => sum + a.data.balance, 0)
  );

  // 按类型分组
  const accountsByType = computed(() => {
    const groups: Record<string, AssetAccount[]> = {};
    visibleAccounts.value.forEach(a => {
      const type = a.data.accountType;
      if (!groups[type]) groups[type] = [];
      groups[type].push(a);
    });
    return groups;
  });

  // 按类型汇总金额
  const totalByType = computed(() => {
    const totals: Record<string, number> = {};
    visibleAccounts.value.forEach(a => {
      totals[a.data.accountType] = (totals[a.data.accountType] || 0) + a.data.balance;
    });
    return totals;
  });

  // 加载所有资产
  async function loadAccounts() {
    loading.value = true;
    try {
      accounts.value = await assetService.getAll();
    } finally {
      loading.value = false;
    }
  }

  // 添加资产
  async function addAccount(data: AssetAccount['data']): Promise<AssetAccount> {
    const doc = await assetService.create(data);
    accounts.value.unshift(doc);
    return doc;
  }

  // 更新资产
  async function updateAccount(id: string, changes: Partial<AssetAccount['data']>) {
    const doc = await assetService.update(id, changes);
    const idx = accounts.value.findIndex(a => a._id === id);
    if (idx !== -1) accounts.value[idx] = doc;
    return doc;
  }

  // 删除资产
  async function deleteAccount(id: string) {
    await assetService.remove(id);
    accounts.value = accounts.value.filter(a => a._id !== id);
  }

  return {
    accounts,
    loading,
    visibleAccounts,
    totalAssets,
    accountsByType,
    totalByType,
    loadAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    getById: assetService.getById.bind(assetService),
  };
});
