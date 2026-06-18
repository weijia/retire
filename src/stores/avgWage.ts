import { ref, computed } from 'vue';
import type { AvgWageDataSet } from '../types';
import { BaseService } from '../db/base';

const avgWageService = new BaseService<AvgWageDataSet>('avg_wage_dataset', 'avg_wage');

export const useAvgWageStore = () => {
  const dataset = ref<AvgWageDataSet | null>(null);
  const loading = ref(false);

  const city = computed(() => dataset.value?.data.city ?? '');
  const province = computed(() => dataset.value?.data.province ?? '');
  const years = computed(() => dataset.value?.data.years ?? []);

  /** 获取某年的社平工资 */
  const getWageByYear = (year: number): number | undefined => {
    return years.value.find(y => y.year === year)?.monthlyAvgWage;
  };

  /** 加载社平工资数据 */
  const loadDataset = async () => {
    loading.value = true;
    try {
      const docs = await avgWageService.getAll();
      dataset.value = docs[0] ?? null;
    } finally {
      loading.value = false;
    }
  };

  /** 保存/更新社平工资数据 */
  const saveDataset = async (data: AvgWageDataSet['data']) => {
    const now = new Date().toISOString();
    if (dataset.value) {
      await avgWageService.update(dataset.value._id, {
        ...data,
        updatedAt: now,
      });
      dataset.value = { ...dataset.value, data, updatedAt: now };
    } else {
      const doc = await avgWageService.create(data);
      dataset.value = doc;
    }
  };

  /** 删除社平工资数据 */
  const removeDataset = async () => {
    if (dataset.value) {
      await avgWageService.remove(dataset.value._id);
      dataset.value = null;
    }
  };

  return {
    dataset,
    loading,
    city,
    province,
    years,
    getWageByYear,
    loadDataset,
    saveDataset,
    removeDataset,
  };
};
