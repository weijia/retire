import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { PensionRecord, PensionConfig, PensionPhase } from '../types';
import { putDoc, getDoc, getAllDocs, removeDoc } from '../db';
import { calculatePension, calculateSufficiency, expandPhasesToRecords, type PensionCalculationResult, type SufficiencyResult } from '../utils/pensionCalc';

export const usePensionStore = defineStore('pension', () => {
  // ============ State ============
  const records = ref<PensionRecord[]>([]);
  const config = ref<PensionConfig | null>(null);
  const loading = ref(false);
  const phases = ref<PensionPhase[]>([]);

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
    return records.value.reduce((sum, r) => {
      const months = r.data.monthsPaid ?? 0;
      return sum + months / 12;
    }, 0);
  });

  /** 总个人缴费额 */
  const totalPersonalPaid = computed(() => {
    return records.value.reduce((sum, r) => sum + r.data.monthlyPersonal * r.data.monthsPaid, 0);
  });

  /** 按起始年份排序的阶段 */
  const sortedPhases = computed(() => {
    return [...phases.value].sort((a, b) => a.startYear - b.startYear);
  });

  /** 从阶段展开的记录 */
  const expandedRecords = computed(() => {
    if (phases.value.length === 0) return records.value;
    const cfg = config.value?.data;
    const retirementYear = cfg ? new Date().getFullYear() + (cfg.retirementAge - (new Date().getFullYear() - 1990)) : new Date().getFullYear() + 25;
    return expandPhasesToRecords(phases.value, retirementYear);
  });

  /** 总缴费年限（含阶段展开） */
  const totalYearsFromPhases = computed(() => {
    if (phases.value.length === 0) return totalYearsPaid.value;
    let years = 0;
    for (const phase of phases.value) {
      years += Math.min(phase.endYear, new Date().getFullYear()) - phase.startYear + 1;
      if (phase.autoFlexEmployment) {
        // 灵活就业年限会在计算时动态确定
      }
    }
    return years;
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

  /** 加载缴费阶段 */
  async function loadPhases() {
    try {
      const doc = await getDoc('pension_phases');
      if (doc) {
        phases.value = (doc as any).data.phases || [];
      }
    } catch {
      phases.value = [];
    }
  }

  /** 保存缴费阶段 */
  async function savePhases(newPhases: PensionPhase[]) {
    const now = new Date().toISOString();
    const existing = await getDoc('pension_phases');
    const doc = {
      _id: 'pension_phases',
      type: 'pension_phases',
      createdAt: (existing as any)?.createdAt || now,
      updatedAt: now,
      data: { phases: JSON.parse(JSON.stringify(newPhases)) },
    };
    await putDoc(doc as any);
    phases.value = newPhases;
  }

  /** 添加缴费阶段 */
  async function addPhase(phase: PensionPhase) {
    const newPhase = {
      ...phase,
      id: Date.now().toString(36),
    };
    const updated = [...phases.value, newPhase];
    await savePhases(updated);
    return newPhase;
  }

  /** 更新缴费阶段 */
  async function updatePhase(id: string, changes: Partial<PensionPhase>) {
    const updated = phases.value.map(p => p.id === id ? { ...p, ...changes } : p);
    await savePhases(updated);
  }

  /** 删除缴费阶段 */
  async function removePhase(id: string) {
    const updated = phases.value.filter(p => p.id !== id);
    await savePhases(updated);
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
    currentYear: number,
    avgWageMap?: Map<number, number>
  ): PensionCalculationResult {
    // 优先使用阶段展开的记录
    const recordsToUse = phases.value.length > 0 ? expandedRecords.value : records.value;
    return calculatePension(recordsToUse, config.value, currentAge, lifeExpectancy, currentYear, avgWageMap);
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
    phases,
    hasConfig,
    sortedRecords,
    totalYearsPaid,
    totalPersonalPaid,
    sortedPhases,
    expandedRecords,
    totalYearsFromPhases,
    loadConfig,
    saveConfig,
    loadRecords,
    loadPhases,
    savePhases,
    addPhase,
    updatePhase,
    removePhase,
    addRecord,
    updateRecord,
    removeRecord,
    computePension,
    computeSufficiency,
  };
});
