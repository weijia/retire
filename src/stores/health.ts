import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { HealthProfile, HealthDailyRecord, LifeExpectancySnapshot } from '../types';
import { putDoc, getDoc, getAllDocs, removeDoc } from '../db';
import { calculateLifeExpectancy, generateSuggestions, type LifeExpectancyResult } from '../utils/lifeExpectancy';

export const useHealthStore = defineStore('health', () => {
  // ============ State ============
  const profile = ref<HealthProfile | null>(null);
  const dailyRecords = ref<HealthDailyRecord[]>([]);
  const snapshots = ref<LifeExpectancySnapshot[]>([]);
  const loading = ref(false);

  const PROFILE_DOC_ID = 'health_profile_main';

  // ============ Getters ============

  /** 是否有健康画像 */
  const hasProfile = computed(() => !!profile.value);

  /** 今日记录 */
  const todayRecords = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return dailyRecords.value.filter(r => r.data.date === today);
  });

  /** 本周记录 */
  const weekRecords = computed(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return dailyRecords.value.filter(r => {
      const d = new Date(r.data.date);
      return d >= weekAgo && d <= now;
    });
  });

  /** 本周净影响（天） */
  const weekNetImpact = computed(() => {
    return weekRecords.value.reduce((sum, r) => sum + r.data.impact, 0);
  });

  /** 按日期分组的记录 */
  const recordsByDate = computed(() => {
    const map: Record<string, HealthDailyRecord[]> = {};
    for (const record of dailyRecords.value) {
      const date = record.data.date;
      if (!map[date]) map[date] = [];
      map[date].push(record);
    }
    // 按日期降序
    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, records]) => ({ date, records }));
  });

  // ============ Actions ============

  /** 加载健康画像 */
  async function loadProfile() {
    try {
      const doc = await getDoc(PROFILE_DOC_ID);
      if (doc) {
        profile.value = doc as HealthProfile;
      }
    } catch {
      profile.value = null;
    }
  }

  /** 保存健康画像 */
  async function saveProfile(data: HealthProfile['data']) {
    const now = new Date().toISOString();
    const plainData = JSON.parse(JSON.stringify(data));

    if (profile.value) {
      const updated: HealthProfile = {
        _id: PROFILE_DOC_ID,
        type: 'health_profile',
        createdAt: profile.value.createdAt,
        updatedAt: now,
        data: plainData,
      };
      await putDoc(updated);
      profile.value = updated;
    } else {
      const newDoc: HealthProfile = {
        _id: PROFILE_DOC_ID,
        type: 'health_profile',
        createdAt: now,
        updatedAt: now,
        data: plainData,
      };
      await putDoc(newDoc);
      profile.value = newDoc;
    }
  }

  /** 加载每日记录 */
  async function loadDailyRecords() {
    loading.value = true;
    try {
      const docs = await getAllDocs('health_daily_record');
      dailyRecords.value = docs as HealthDailyRecord[];
    } finally {
      loading.value = false;
    }
  }

  /** 添加每日记录 */
  async function addDailyRecord(data: Omit<HealthDailyRecord['data'], 'impact'> & { impact: number }) {
    const now = new Date().toISOString();
    const id = `health_daily_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const doc: HealthDailyRecord = {
      _id: id,
      type: 'health_daily_record',
      createdAt: now,
      updatedAt: now,
      data: JSON.parse(JSON.stringify(data)),
    };
    await putDoc(doc);
    dailyRecords.value.unshift(doc);
    return doc;
  }

  /** 删除每日记录 */
  async function removeDailyRecord(id: string) {
    await removeDoc(id);
    dailyRecords.value = dailyRecords.value.filter(r => r._id !== id);
  }

  /** 加载快照 */
  async function loadSnapshots() {
    try {
      const docs = await getAllDocs('life_expectancy_snapshot');
      snapshots.value = (docs as LifeExpectancySnapshot[]).sort(
        (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
      );
    } catch {
      snapshots.value = [];
    }
  }

  /** 保存快照 */
  async function saveSnapshot(result: LifeExpectancyResult) {
    const today = new Date().toISOString().slice(0, 10);
    const id = `le_snapshot_${today}`;

    const existing = await getDoc(id);
    const now = new Date().toISOString();

    const doc: LifeExpectancySnapshot = {
      _id: id,
      type: 'life_expectancy_snapshot',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      data: {
        date: today,
        baselineAge: result.baselineTotalAge,
        adjustedAge: result.adjustedTotalAge,
        totalAdjustmentDays: result.totalAdjustmentDays,
        profileAdjustmentDays: result.profileAdjustmentDays,
        dailyAdjustmentDays: result.dailyAdjustmentDays,
        breakdown: result.breakdown,
      },
    };
    await putDoc(doc);

    // 更新本地快照列表
    const idx = snapshots.value.findIndex(s => s._id === id);
    if (idx >= 0) {
      snapshots.value[idx] = doc;
    } else {
      snapshots.value.unshift(doc);
    }
  }

  /** 计算预期寿命（不保存快照） */
  function computeLifeExpectancy(currentAge: number, gender: 'male' | 'female'): LifeExpectancyResult {
    return calculateLifeExpectancy(profile.value, dailyRecords.value, currentAge, gender);
  }

  /** 计算并保存预期寿命快照 */
  async function calculateAndSave(currentAge: number, gender: 'male' | 'female') {
    const result = computeLifeExpectancy(currentAge, gender);
    await saveSnapshot(result);
    return result;
  }

  /** 获取改善建议 */
  function getSuggestions(result: LifeExpectancyResult): string[] {
    return generateSuggestions(profile.value, result);
  }

  return {
    profile,
    dailyRecords,
    snapshots,
    loading,
    hasProfile,
    todayRecords,
    weekRecords,
    weekNetImpact,
    recordsByDate,
    loadProfile,
    saveProfile,
    loadDailyRecords,
    addDailyRecord,
    removeDailyRecord,
    loadSnapshots,
    saveSnapshot,
    computeLifeExpectancy,
    calculateAndSave,
    getSuggestions,
  };
});
