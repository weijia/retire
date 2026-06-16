import type { PensionRecord, PensionConfig } from '../types';

/**
 * 计发月数（根据退休年龄）
 */
const payoutMonths: Record<number, number> = {
  50: 195,
  51: 190,
  52: 185,
  53: 180,
  54: 175,
  55: 170,
  56: 164,
  57: 158,
  58: 152,
  59: 145,
  60: 139,
  61: 132,
  62: 125,
  63: 117,
  64: 109,
  65: 101,
  66: 93,
  67: 84,
  68: 75,
  69: 65,
  70: 56,
};

/**
 * 获取计发月数
 */
export function getPayoutMonths(retirementAge: number): number {
  return payoutMonths[retirementAge] || 139;
}

/**
 * 养老金测算结果
 */
export interface PensionCalculationResult {
  monthlyPension: number;
  annualPension: number;
  totalPension: number;
  yearsReceivable: number;
  monthsReceivable: number;
  basicPension: number;
  personalPension: number;
  totalPersonalContribution: number;
  totalEmployerContribution: number;
  totalYearsPaid: number;
  averageMonthlyBase: number;
  averageWageIndex: number;
}

/**
 * 资产充足性分析结果
 */
export interface SufficiencyResult {
  retirementAssets: number;
  pensionTotal: number;
  totalAvailable: number;
  annualAvailable: number;
  monthlyAvailable: number;
  monthlyExpense: number;
  isSufficient: boolean;
  gap: number;
}

/**
 * 计算养老金
 * @param records 养老金缴存记录
 * @param config 养老金配置
 * @param currentAge 当前年龄
 * @param lifeExpectancy 预期寿命
 * @param currentYear 当前年份
 */
export function calculatePension(
  records: PensionRecord[],
  config: PensionConfig | null,
  currentAge: number,
  lifeExpectancy: number,
  _currentYear: number
): PensionCalculationResult {
  const cfg = config?.data || {
    pensionType: 'basic' as const,
    currentPensionBalance: 0,
    expectedPensionGrowthRate: 3,
    averageWageGrowthRate: 5,
    retirementAge: 65,
    pensionReplaceRate: 45,
  };

  const retirementAge = cfg.retirementAge;
  const yearsToRetire = Math.max(0, retirementAge - currentAge);

  // 计算累计缴费年限和平均缴费基数
  let totalYearsPaid = 0;
  let totalPersonalContribution = cfg.currentPensionBalance;
  let totalEmployerContribution = 0;
  let totalMonthsPaid = 0;
  let weightedBaseSum = 0;

  for (const record of records) {
    const d = record.data;
    totalYearsPaid += d.monthsPaid / 12;
    totalPersonalContribution += d.monthlyPersonal * d.monthsPaid;
    totalEmployerContribution += d.monthlyEmployer * d.monthsPaid;
    totalMonthsPaid += d.monthsPaid;
    weightedBaseSum += d.monthlyBase * d.monthsPaid;
  }

  const averageMonthlyBase = totalMonthsPaid > 0 ? weightedBaseSum / totalMonthsPaid : 0;

  // 假设社平工资增长率，推算退休时社平工资
  const currentAvgWage = 8000; // 当前社平工资假设值（元/月）
  const avgWageGrowthRate = cfg.averageWageGrowthRate / 100;
  const retirementAvgWage = currentAvgWage * Math.pow(1 + avgWageGrowthRate, yearsToRetire);

  // 平均缴费工资指数
  const averageWageIndex = averageMonthlyBase > 0 ? averageMonthlyBase / currentAvgWage : 1;

  // 个人账户增长
  const growthRate = cfg.expectedPensionGrowthRate / 100;
  const personalAccountBalance = totalPersonalContribution * Math.pow(1 + growthRate, yearsToRetire);

  // 基础养老金
  const basicPension = retirementAvgWage * (1 + averageWageIndex) / 2 * totalYearsPaid * 0.01;

  // 个人账户养老金
  const payoutM = getPayoutMonths(retirementAge);
  const personalPension = personalAccountBalance / payoutM;

  // 月养老金总额
  const monthlyPension = basicPension + personalPension;
  const annualPension = monthlyPension * 12;

  // 可领取年数
  const yearsReceivable = Math.max(0, lifeExpectancy - retirementAge);
  const monthsReceivable = yearsReceivable * 12;

  // 养老金总额
  const totalPension = monthlyPension * monthsReceivable;

  return {
    monthlyPension: Math.round(monthlyPension),
    annualPension: Math.round(annualPension),
    totalPension: Math.round(totalPension),
    yearsReceivable: Math.round(yearsReceivable * 10) / 10,
    monthsReceivable: Math.round(monthsReceivable),
    basicPension: Math.round(basicPension),
    personalPension: Math.round(personalPension),
    totalPersonalContribution: Math.round(totalPersonalContribution),
    totalEmployerContribution: Math.round(totalEmployerContribution),
    totalYearsPaid: Math.round(totalYearsPaid * 10) / 10,
    averageMonthlyBase: Math.round(averageMonthlyBase),
    averageWageIndex: Math.round(averageWageIndex * 100) / 100,
  };
}

/**
 * 计算资产充足性
 * @param retirementAssets 退休时总资产
 * @param pensionResult 养老金测算结果
 * @param annualExpense 年支出
 */
export function calculateSufficiency(
  retirementAssets: number,
  pensionResult: PensionCalculationResult,
  annualExpense: number
): SufficiencyResult {
  const pensionTotal = pensionResult.totalPension;
  const totalAvailable = retirementAssets + pensionTotal;
  const yearsReceivable = pensionResult.yearsReceivable;

  const annualAvailable = yearsReceivable > 0 ? totalAvailable / yearsReceivable : 0;
  const monthlyAvailable = annualAvailable / 12;
  const monthlyExpense = annualExpense / 12;

  const isSufficient = monthlyAvailable >= monthlyExpense;
  const gap = isSufficient ? 0 : (monthlyExpense - monthlyAvailable) * yearsReceivable * 12;

  return {
    retirementAssets: Math.round(retirementAssets),
    pensionTotal: Math.round(pensionTotal),
    totalAvailable: Math.round(totalAvailable),
    annualAvailable: Math.round(annualAvailable),
    monthlyAvailable: Math.round(monthlyAvailable),
    monthlyExpense: Math.round(monthlyExpense),
    isSufficient,
    gap: Math.round(gap),
  };
}
