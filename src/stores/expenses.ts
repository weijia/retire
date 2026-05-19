import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ExpenseRecord } from '../types';
import { BaseService } from '../db/base';
import { getCurrentYearMonth } from '../utils/format';

const expenseService = new BaseService<ExpenseRecord>('expense_record', 'expense');

export const useExpensesStore = defineStore('expenses', () => {
  const records = ref<ExpenseRecord[]>([]);
  const loading = ref(false);

  // 当月消费记录
  const currentMonthRecords = computed(() => {
    const ym = getCurrentYearMonth();
    return records.value.filter(r => r.data.date.startsWith(ym));
  });

  // 当月消费总额
  const monthlyTotal = computed(() =>
    currentMonthRecords.value.reduce((sum, r) => sum + r.data.amount, 0)
  );

  // 最近消费记录（最新10条）
  const recentRecords = computed(() => records.value.slice(0, 10));

  // 按类别汇总当月消费
  const monthlyByCategory = computed(() => {
    const totals: Record<string, number> = {};
    currentMonthRecords.value.forEach(r => {
      totals[r.data.category] = (totals[r.data.category] || 0) + r.data.amount;
    });
    return totals;
  });

  // 加载所有记录
  async function loadRecords() {
    loading.value = true;
    try {
      records.value = await expenseService.getAll();
    } finally {
      loading.value = false;
    }
  }

  // 添加记录
  async function addRecord(data: ExpenseRecord['data']): Promise<ExpenseRecord> {
    const doc = await expenseService.create(data);
    records.value.unshift(doc);
    return doc;
  }

  // 更新记录
  async function updateRecord(id: string, changes: Partial<ExpenseRecord['data']>) {
    const doc = await expenseService.update(id, changes);
    const idx = records.value.findIndex(r => r._id === id);
    if (idx !== -1) records.value[idx] = doc;
    return doc;
  }

  // 删除记录
  async function deleteRecord(id: string) {
    await expenseService.remove(id);
    records.value = records.value.filter(r => r._id !== id);
  }

  // 检查本月是否已自动记录某固定支出
  async function hasAutoRecordThisMonth(planId: string): Promise<boolean> {
    const ym = getCurrentYearMonth();
    const planRecords = records.value.filter(r => 
      r.data.linkedPlanId === planId && 
      r.data.date.startsWith(ym) &&
      r.data.description?.includes('[自动]')
    );
    return planRecords.length > 0;
  }

  // 自动记录固定支出
  async function autoRecordFixedExpenses(fixedPlans: { _id: string; data: { name: string; monthlyAmount: number; category: string } }[]) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);

    for (const plan of fixedPlans) {
      const alreadyRecorded = await hasAutoRecordThisMonth(plan._id);
      if (!alreadyRecorded) {
        await addRecord({
          date: dateStr,
          amount: plan.data.monthlyAmount,
          category: plan.data.category as any,
          description: `[自动] ${plan.data.name}`,
          linkedPlanId: plan._id,
          tags: ['自动记录', '固定支出'],
        });
      }
    }
  }

  return {
    records,
    loading,
    currentMonthRecords,
    monthlyTotal,
    recentRecords,
    monthlyByCategory,
    loadRecords,
    addRecord,
    updateRecord,
    deleteRecord,
    getById: expenseService.getById.bind(expenseService),
    autoRecordFixedExpenses,
    hasAutoRecordThisMonth,
  };
});
