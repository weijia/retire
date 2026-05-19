import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ExpensePlan } from '../types';
import { BaseService } from '../db/base';
import { getCurrentYear } from '../utils/format';

const planService = new BaseService<ExpensePlan>('expense_plan', 'plan');

export const usePlansStore = defineStore('plans', () => {
  const plans = ref<ExpensePlan[]>([]);
  const loading = ref(false);

  // 当前年份的计划
  const currentYearPlans = computed(() => {
    const year = getCurrentYear();
    return plans.value.filter(p => p.data.year === year && p.data.isActive);
  });

  // 所有激活的计划（用于计算年均支出）
  const allActivePlans = computed(() => {
    return plans.value.filter(p => p.data.isActive);
  });

  // 社保类计划（只在空窗期需要自己缴纳）
  const socialPensionPlans = computed(() => {
    return allActivePlans.value.filter(p => p.data.category === 'social_pension');
  });

  // 非社保类计划（工作期间和空窗期都需要支出）
  const nonSocialPensionPlans = computed(() => {
    return allActivePlans.value.filter(p => p.data.category !== 'social_pension');
  });

  // 月度计划总额（仅当年，不含社保）
  const monthlyPlanTotal = computed(() =>
    currentYearPlans.value
      .filter(p => p.data.category !== 'social_pension')
      .reduce((sum, p) => sum + p.data.monthlyAmount, 0)
  );

  // 年度计划总额（不含社保，工作期间的日常支出）
  const annualPlanTotal = computed(() => {
    if (nonSocialPensionPlans.value.length === 0) return 0;
    return nonSocialPensionPlans.value.reduce((sum, p) => sum + p.data.annualAmount, 0);
  });

  // 年度社保支出总额（空窗期才需要自己缴纳）
  const annualSocialPensionTotal = computed(() => {
    if (socialPensionPlans.value.length === 0) return 0;
    return socialPensionPlans.value.reduce((sum, p) => sum + p.data.annualAmount, 0);
  });

  // 固定支出计划（用于自动记录，不含社保）
  const fixedPlans = computed(() =>
    currentYearPlans.value.filter(p => p.data.isFixed && p.data.category !== 'social_pension')
  );

  // 按类别分组
  const plansByCategory = computed(() => {
    const groups: Record<string, ExpensePlan[]> = {};
    currentYearPlans.value.forEach(p => {
      const cat = p.data.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  });

  // 加载所有计划
  async function loadPlans() {
    loading.value = true;
    try {
      plans.value = await planService.getAll();
    } finally {
      loading.value = false;
    }
  }

  // 添加计划
  async function addPlan(data: ExpensePlan['data']): Promise<ExpensePlan> {
    const doc = await planService.create(data);
    plans.value.unshift(doc);
    return doc;
  }

  // 更新计划
  async function updatePlan(id: string, changes: Partial<ExpensePlan['data']>) {
    const doc = await planService.update(id, changes);
    const idx = plans.value.findIndex(p => p._id === id);
    if (idx !== -1) plans.value[idx] = doc;
    return doc;
  }

  // 删除计划
  async function deletePlan(id: string) {
    await planService.remove(id);
    plans.value = plans.value.filter(p => p._id !== id);
  }

  return {
    plans,
    loading,
    currentYearPlans,
    monthlyPlanTotal,
    annualPlanTotal,
    annualSocialPensionTotal,
    fixedPlans,
    plansByCategory,
    loadPlans,
    addPlan,
    updatePlan,
    deletePlan,
    getById: planService.getById.bind(planService),
  };
});
