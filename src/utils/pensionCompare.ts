import type { PensionRecord, PensionConfig, PensionPhase } from '../types';
import { calculatePension, expandPhasesToRecords } from './pensionCalc';

/**
 * 灵活就业方案参数
 */
export interface FlexPlan {
  name: string;
  startYear: number;
  endYear: number;
  basePercent: number;      // 缴费档次 60/80/100/200/300
  monthsPerYear: number;    // 每年缴费月数
  retirementAge: number;    // 退休年龄
}

/**
 * 方案对比结果
 */
export interface FlexPlanResult {
  plan: FlexPlan;
  monthlyPension: number;      // 月养老金
  annualPension: number;       // 年养老金
  totalPension: number;        // 养老金总额（到预期寿命）
  totalYearsPaid: number;      // 总缴费年限
  totalPersonalPaid: number;   // 个人总缴费额
  personalAccountBalance: number; // 退休时个人账户余额
  basicPension: number;        // 基础养老金
  personalPension: number;     // 个人账户养老金
  roi: number;                 // 投入产出比（养老金总额 / 个人总缴费）
  // 计算过程
  averageWageIndex: number;    // 平均缴费指数
  retirementAvgWage: number;   // 退休时社平工资
  payoutMonths: number;        // 计发月数
  totalYears: number;          // 总缴费年限（含视同）
  avgGrowthRate: number;       // 社平工资增长率
  replacementRate: number;    // 替代率（月养老金 / 当前月工资）
  currentMonthlyWage: number;  // 当前月工资（用于替代率计算）
}

/**
 * 生成默认对比方案
 */
export function generateDefaultPlans(
  currentYear: number,
  currentAge: number,
  defaultRetirementAge: number
): FlexPlan[] {
  const plans: FlexPlan[] = [];

  // 方案1：最低档，缴满到退休
  plans.push({
    name: '最低档缴满',
    startYear: currentYear,
    endYear: currentYear + (defaultRetirementAge - currentAge) - 1,
    basePercent: 60,
    monthsPerYear: 12,
    retirementAge: defaultRetirementAge,
  });

  // 方案2：100%档次，缴满到退休
  plans.push({
    name: '100%档次缴满',
    startYear: currentYear,
    endYear: currentYear + (defaultRetirementAge - currentAge) - 1,
    basePercent: 100,
    monthsPerYear: 12,
    retirementAge: defaultRetirementAge,
  });

  // 方案3：最低档，只缴5年
  plans.push({
    name: '最低档缴5年',
    startYear: currentYear,
    endYear: currentYear + 4,
    basePercent: 60,
    monthsPerYear: 12,
    retirementAge: defaultRetirementAge,
  });

  // 方案4：提前退休（少缴3年）
  plans.push({
    name: '提前3年退休',
    startYear: currentYear,
    endYear: currentYear + (defaultRetirementAge - currentAge) - 4,
    basePercent: 60,
    monthsPerYear: 12,
    retirementAge: defaultRetirementAge - 3,
  });

  // 方案5：最高档，缴满到退休
  plans.push({
    name: '最高档缴满',
    startYear: currentYear,
    endYear: currentYear + (defaultRetirementAge - currentAge) - 1,
    basePercent: 300,
    monthsPerYear: 12,
    retirementAge: defaultRetirementAge,
  });

  return plans;
}

/**
 * 计算单个灵活就业方案
 */
export function calculateFlexPlan(
  plan: FlexPlan,
  existingRecords: PensionRecord[],
  config: PensionConfig | null,
  currentAge: number,
  lifeExpectancy: number,
  currentYear: number,
  avgWageMap?: Map<number, number>
): FlexPlanResult {
  // 构建灵活就业阶段
  const flexPhase: PensionPhase = {
    phaseType: 'flex',
    startYear: plan.startYear,
    endYear: plan.endYear,
    monthlyBase: 0, // 灵活就业会动态计算
    avgWage: avgWageMap?.get(plan.startYear) || 8000,
    personalRate: 8,
    employerRate: 12,
    monthsPaidPerYear: plan.monthsPerYear,
    flexBasePercent: plan.basePercent,
  };

  // 展开灵活就业记录（retirementYear = 当前年份 + 退休年龄 - 当前年龄）
  const retirementYear = currentYear + (plan.retirementAge - currentAge);
  const flexRecords = expandPhasesToRecords([flexPhase], retirementYear, avgWageMap);

  // 合并已有记录和灵活就业记录
  const mergedRecords = [...existingRecords];
  const existingYears = new Set(mergedRecords.map(r => r.data.year));

  for (const fr of flexRecords) {
    if (!existingYears.has(fr.data.year)) {
      mergedRecords.push(fr);
    }
  }

  // 调整退休年龄的配置
  const adjustedConfig = config ? {
    ...config,
    data: {
      ...config.data,
      retirementAge: plan.retirementAge,
    },
  } : null;

  // 计算养老金
  const result = calculatePension(
    mergedRecords,
    adjustedConfig,
    currentAge,
    lifeExpectancy,
    currentYear,
    avgWageMap
  );

  // 计算个人总缴费
  let totalPersonalPaid = 0;
  for (const fr of flexRecords) {
    totalPersonalPaid += fr.data.monthlyPersonal * fr.data.monthsPaid;
  }

  // 计算当前月工资（取最近一年缴费记录的月基数）
  const sortedExisting = [...existingRecords].sort((a, b) => b.data.year - a.data.year);
  const currentMonthlyWage = sortedExisting.length > 0
    ? sortedExisting[0].data.monthlyBase
    : (avgWageMap ? [...avgWageMap.values()].pop() || 8000 : 8000);

  return {
    plan,
    monthlyPension: result.monthlyPension,
    annualPension: result.annualPension,
    totalPension: result.totalPension,
    totalYearsPaid: result.totalYearsPaid,
    totalPersonalPaid: Math.round(totalPersonalPaid),
    personalAccountBalance: result.personalAccountBalance,
    basicPension: result.basicPension,
    personalPension: result.personalPension,
    roi: totalPersonalPaid > 0 ? Math.round(result.totalPension / totalPersonalPaid * 100) / 100 : 0,
    averageWageIndex: result.averageWageIndex,
    retirementAvgWage: result.retirementAvgWage,
    payoutMonths: result.payoutMonths,
    totalYears: result.totalYears,
    avgGrowthRate: result.avgGrowthRate,
    replacementRate: currentMonthlyWage > 0
      ? Math.round(result.monthlyPension / currentMonthlyWage * 1000) / 10
      : 0,
    currentMonthlyWage,
  };
}

/**
 * 批量计算多个方案
 */
export function compareFlexPlans(
  plans: FlexPlan[],
  existingRecords: PensionRecord[],
  config: PensionConfig | null,
  currentAge: number,
  lifeExpectancy: number,
  currentYear: number,
  avgWageMap?: Map<number, number>
): FlexPlanResult[] {
  return plans.map(plan =>
    calculateFlexPlan(plan, existingRecords, config, currentAge, lifeExpectancy, currentYear, avgWageMap)
  );
}
