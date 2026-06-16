import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { PensionRecord, PensionConfig } from '../types';
import { putDoc, getDoc, getAllDocs, removeDoc } from '../db';
import { calculatePension, calculateSufficiency, type PensionCalculationResult, type SufficiencyResult } from '../utils/pensionCalc';

export const usePensionStore = defineStore('pension', () => {
  // ============ State ============
  const records = ref<PensionRecord[]>([]);
  const config = ref<PensionConfig | null>(null);
  const loading = ref(false);

  const CONFIG_DOC_ID = 'pension_config_main';

  // ============ Getters ============

  /** 是否有配置 */
  const hasConfig = computed(() => !!config.value);

  /** 按年份排序的缴存记录 */
  const sortedRecords = computed(() => {
    return [...records.value].sort((a, b) => a.data.year - b.data.year);
  });

  /** 总缴费年数 */
  const totalYearsPaid = computed(() => {
    return records.value.reduce((sum, r) => sum + r.data.monthsPaid / 12, 0);
  });

  /** 总个人缴费额 */
  const totalPersonalPaid = computed(() => {
    return records.value.reduce((sum, r) => sum + r.data.monthlyPersonal * r.data.monthsPaid, 0);
  });

  // ============ Actions ============

  /** 加载养老金配置 */
  async function loadConfig() {
    try {
      const doc = await getDoc(CONFIG_DOC_ID);
      if (doc) {
        config.value = doc as PensionConfig;
      }
    } catch {
      config.value = null;
    }
  }

  /** 保存养老金配置 */
  async function saveConfig(data: PensionConfig['data']) {
    const now = new Date().toISOString();
    const plainData = JSON.parse(JSON.stringify(data));

    if (config.value) {
      const updated: PensionConfig = {
        _id: CONFIG_DOC_ID,
        type: 'pension_config',
        createdAt: config.value.createdAt,
        updatedAt: now,
        data: plainData,
      };
      await putDoc(updated);
      config.value = updated;
    } else {
      const newDoc: PensionConfig = {
        _id: CONFIG_DOC_ID,
        type: 'pension_config',
        createdAt: now,
        updatedAt: now,
        data: plainData,
      };
      await putDoc(newDoc);
      config.value = newDoc;
    }
  }

  /** 加载缴存记录 */
  async function loadRecords() {
    loading.value = true;
    try {
      const docs = await getAllDocs('pension_record');
      records.value = docs as PensionRecord[];
    } finally {
      loading.value = false;
    }
  }

  /** 添加缴存记录 */
  async function addRecord(data: PensionRecord['data']) {
    const now = new Date().toISOString();
    const id = `pension_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

    // 自动计算
    const monthlyPersonal = Math.round(data.monthlyBase * (data.personalRate / 100));
    const monthlyEmployer = Math.round(data.monthlyBase * (data.employerRate / 100));
    const totalPaid = monthlyPersonal * data.monthsPaid + monthlyEmployer * data.monthsPaid;

    const doc: PensionRecord = {
      _id: id,
      type: 'pension_record',
      createdAt: now,
      updatedAt: now,
      data: {
        ...JSON.parse(JSON.stringify(data)),
        monthlyPersonal,
        monthlyEmployer,
        totalPaid,
      },
    };
    await putDoc(doc);
    records.value.unshift(doc);
    return doc;
  }

  /** 更新缴存记录 */
  async function updateRecord(id: string, changes: Partial<PensionRecord['data']>) {
    const existing = records.value.find(r => r._id === id);
    if (!existing) return;

    const merged = { ...existing.data, ...changes };

    // 重新计算派生字段
    const monthlyPersonal = Math.round(merged.monthlyBase * (merged.personalRate / 100));
    const monthlyEmployer = Math.round(merged.monthlyBase * (merged.employerRate / 100));
    const totalPaid = monthlyPersonal * merged.monthsPaid + monthlyEmployer * merged.monthsPaid;

    const updatedData = {
      ...merged,
      monthlyPersonal,
      monthlyEmployer,
      totalPaid,
    };

    const now = new Date().toISOString();
    const updated: PensionRecord = {
      ...existing,
      data: updatedData,
      updatedAt: now,
    };
    await putDoc(updated);

    const idx = records.value.findIndex(r => r._id === id);
    if (idx >= 0) records.value[idx] = updated;
  }

  /** 删除缴存记录 */
  async function removeRecord(id: string) {
    await removeDoc(id);
    records.value = records.value.filter(r => r._id !== id);
  }

  /** 计算养老金 */
  function computePension(
    currentAge: number,
    lifeExpectancy: number,
    currentYear: number
  ): PensionCalculationResult {
    return calculatePension(records.value, config.value, currentAge, lifeExpectancy, currentYear);
  }

  /** 计算充足性 */
  function computeSufficiency(
    retirementAssets: number,
    pensionResult: PensionCalculationResult,
    annualExpense: number
  ): SufficiencyResult {
    return calculateSufficiency(retirementAssets, pensionResult, annualExpense);
  }

  return {
    records,
    config,
    loading,
    hasConfig,
    sortedRecords,
    totalYearsPaid,
    totalPersonalPaid,
    loadConfig,
    saveConfig,
    loadRecords,
    addRecord,
    updateRecord,
    removeRecord,
    computePension,
    computeSufficiency,
  };
});
