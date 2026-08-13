/**
 * 数据同步 Pinia Store
 *
 * 管理数据同步组的状态和操作
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  initDataSync,
  listAccountBackends,
  addDataBackend,
  removeDataBackend,
  listDataBackends,
  flushDataSync,
  getStorageFields,
  getStorageDefaults,
  loadExpenseRecords,
  saveExpenseRecords,
  loadAssets,
  saveAssets,
  loadPensionRecords,
  savePensionRecords,
  loadHealthRecords,
  saveHealthRecords,
  loadPlans,
  savePlans,
} from '../config/dataSync';
import type { BackendParamDef } from 'zen-fs-config';
import { createLogger } from '@richard432/localstorage-logger';
const log = createLogger('retire:data-sync-store');

export const useDataSyncStore = defineStore('dataSync', () => {
  // ============ State ============
  const initialized = ref(false);
  const accountBackends = ref<Array<{ id: string; type: string; options: Record<string, unknown> }>>([]);
  const dataBackends = ref<Array<{ id: string; type: string; description?: string }>>([]);
  const syncing = ref(false);

  // ============ 初始化 ============
  async function init() {
    if (initialized.value) return;

    try {
      await initDataSync();
      await refresh();
      initialized.value = true;
      log.log('初始化完成');
    } catch (err) {
      log.error('初始化失败:', err);
    }
  }

  // ============ 刷新状态 ============
  async function refresh() {
    try {
      accountBackends.value = await listAccountBackends();
      dataBackends.value = listDataBackends();
    } catch (err) {
      log.error('刷新状态失败:', err);
    }
  }

  // ============ 后端管理 ============
  async function addBackend(
    backendId: string,
    backendType: string,
    options: Record<string, unknown>,
    accountBackendId: string,
    description?: string
  ) {
    syncing.value = true;
    try {
      await addDataBackend(backendId, backendType, options, accountBackendId, description);
      await refresh();
    } finally {
      syncing.value = false;
    }
  }

  async function removeBackend(backendId: string) {
    syncing.value = true;
    try {
      await removeDataBackend(backendId);
      await refresh();
    } finally {
      syncing.value = false;
    }
  }

  async function flush() {
    syncing.value = true;
    try {
      await flushDataSync();
    } finally {
      syncing.value = false;
    }
  }

  // ============ 数据操作 ============
  async function loadData() {
    const expenses = await loadExpenseRecords();
    const assets = await loadAssets();
    const pensionRecords = await loadPensionRecords();
    const healthRecords = await loadHealthRecords();
    const plans = await loadPlans();

    return { expenses, assets, pensionRecords, healthRecords, plans };
  }

  async function saveAllData(data: {
    expenses?: unknown[];
    assets?: unknown[];
    pensionRecords?: unknown[];
    healthRecords?: unknown[];
    plans?: unknown[];
  }) {
    if (data.expenses) await saveExpenseRecords(data.expenses);
    if (data.assets) await saveAssets(data.assets);
    if (data.pensionRecords) await savePensionRecords(data.pensionRecords);
    if (data.healthRecords) await saveHealthRecords(data.healthRecords);
    if (data.plans) await savePlans(data.plans);
    await flush();
  }

  // ============ 存储位置字段辅助 ============
  /**
   * 获取指定后端类型的存储位置字段定义
   * 用于 data-sync 后端添加表单的动态生成（过滤掉账号字段）
   */
  function getStorageFieldDefs(backendType: string): BackendParamDef[] {
    return getStorageFields(backendType);
  }

  /**
   * 获取指定后端类型的存储位置字段缺省值
   */
  function getStorageDefaultValues(backendType: string): Record<string, string> {
    return getStorageDefaults(backendType);
  }

  return {
    // State
    initialized,
    accountBackends,
    dataBackends,
    syncing,
    // Actions
    init,
    refresh,
    addBackend,
    removeBackend,
    flush,
    // Storage field helpers
    getStorageFieldDefs,
    getStorageDefaultValues,
    // Data operations
    loadData,
    saveAllData,
    loadExpenseRecords,
    saveExpenseRecords,
    loadAssets,
    saveAssets,
    loadPensionRecords,
    savePensionRecords,
    loadHealthRecords,
    saveHealthRecords,
    loadPlans,
    savePlans,
  };
});