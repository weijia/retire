import type { PensionRecord, PensionConfig, PensionPhase } from '../types';

/**
 * 计发月数（根据退休年龄）
 * 来源：国务院关于完善企业职工基本养老保险制度的决定（国发〔2005〕38号）
 */
const payoutMonths: Record<number, number> = {
  40: 233, 41: 230, 42: 226, 43: 223, 44: 220, 45: 216,
  46: 212, 47: 208, 48: 204, 49: 199, 50: 195, 51: 190,
  52: 185, 53: 180, 54: 175, 55: 170, 56: 164, 57: 158,
  58: 152, 59: 145, 60: 139, 61: 132, 62: 125, 63: 117,
  64: 109, 65: 101, 66: 93, 67: 84, 68: 75, 69: 65, 70: 56,
};

/**
 * 历年个人账户记账利率（简化版，实际应按人社部每年公布值）
 * 2016年后由人社部统一公布，此前按银行定期存款利率
 */
const historicalInterestRates: Record<number, number> = {
  2010: 2.25, 2011: 3.25, 2012: 3.25, 2013: 3.25, 2014: 3.25,
  2015: 3.25, 2016: 8.31, 2017: 7.12, 2018: 8.29, 2019: 7.61,
  2020: 6.04, 2021: 6.69, 2022: 6.12, 2023: 3.97, 2024: 3.5,
  2025: 3.5, 2026: 3.5,
};

/**
 * 获取计发月数
 */
export function getPayoutMonths(retirementAge: number): number {
  const clamped = Math.max(40, Math.min(70, Math.round(retirementAge)));
  return payoutMonths[clamped] || 139;
}

/**
 * 获取某年度记账利率
 */
function getInterestRate(year: number): number {
  return historicalInterestRates[year] ?? 3.0;
}

/**
 * 养老金测算结果
 */
export interface PensionCalculationResult {
  monthlyPension: number;           // 月养老金总额
  annualPension: number;            // 年养老金
  totalPension: number;             // 养老金总额（到预期寿命）
  yearsReceivable: number;          // 可领取年数
  monthsReceivable: number;         // 可领取月数

  // 分项
  basicPension: number;             // 基础养老金
  personalPension: number;          // 个人账户养老金
  transitionalPension: number;      // 过渡性养老金

  // 明细
  totalYearsPaid: number;           // 累计实际缴费年限
  totalDeemedYears: number;         // 视同缴费年限
  totalYears: number;               // 总缴费年限（实际+视同）
  averageWageIndex: number;         // 平均缴费工资指数
  personalAccountBalance: number;   // 退休时个人账户余额
  retirementAvgWage: number;        // 退休时上年度社平工资

  // 历年明细
  yearlyDetails: YearlyDetail[];
}

export interface YearlyDetail {
  year: number;
  monthlyBase: number;
  avgWage: number;
  wageIndex: number;
  monthsPaid: number;
  personalContribution: number;
  accountBalanceEOY: number;
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
 * 精确计算养老金
 *
 * 计算公式依据：《国务院关于完善企业职工基本养老保险制度的决定》（国发〔2005〕38号）
 *
 * 月养老金 = 基础养老金 + 个人账户养老金 + 过渡性养老金
 *
 * 1. 基础养老金 = 退休时上年度社平工资 × (1 + 平均缴费指数) / 2 × 缴费年限 × 1%
 * 2. 个人账户养老金 = 退休时个人账户储存额 / 计发月数
 * 3. 过渡性养老金 = 退休时上年度社平工资 × 视同缴费指数 × 视同缴费年限 × 过渡系数
 */
export function calculatePension(
  records: PensionRecord[],
  config: PensionConfig | null,
  currentAge: number,
  lifeExpectancy: number,
  currentYear: number
): PensionCalculationResult {
  const cfg = config?.data || {
    pensionType: 'basic' as const,
    currentPensionBalance: 0,
    retirementAge: 60,
    hasTransitionalPension: false,
    deemedYears: 0,
    deemedIndex: 1.0,
    transitionalRate: 1.3,
  };

  const retirementAge = cfg.retirementAge;
  const retirementYear = currentYear + (retirementAge - currentAge);

  // ========== 第一步：逐年计算个人账户累积 ==========

  // 按年份排序
  const sortedRecords = [...records].sort((a, b) => a.data.year - b.data.year);

  let accountBalance = cfg.currentPensionBalance;
  let totalYearsPaid = 0;
  let totalMonthsPaid = 0;
  let weightedIndexSum = 0;
  const yearlyDetails: YearlyDetail[] = [];

  for (const record of sortedRecords) {
    const d = record.data;
    const year = d.year;

    // 当年的缴费指数 = 缴费基数 / 社平工资
    const wageIndex = d.avgWage > 0 ? d.monthlyBase / d.avgWage : 1.0;

    // 当年个人缴费总额
    const personalContribution = d.monthlyPersonal * d.monthsPaid;

    // 计入个人账户（当年缴费在年底一次性计入，然后计算利息）
    accountBalance += personalContribution;

    // 当年利息（按年底余额计算年度利息）
    const interestRate = getInterestRate(year) / 100;
    const interest = accountBalance * interestRate;
    accountBalance += interest;

    // 累计统计
    totalYearsPaid += d.monthsPaid / 12;
    totalMonthsPaid += d.monthsPaid;
    weightedIndexSum += wageIndex * d.monthsPaid;

    yearlyDetails.push({
      year,
      monthlyBase: d.monthlyBase,
      avgWage: d.avgWage,
      wageIndex: Math.round(wageIndex * 100) / 100,
      monthsPaid: d.monthsPaid,
      personalContribution,
      accountBalanceEOY: Math.round(accountBalance),
    });
  }

  // ========== 第二步：计算到退休时的个人账户增长 ==========

  // 如果还有到退休前的年份，按假设利率继续增长
  const lastRecordYear = sortedRecords.length > 0
    ? sortedRecords[sortedRecords.length - 1].data.year
    : currentYear;

  for (let y = lastRecordYear + 1; y < retirementYear; y++) {
    const interestRate = getInterestRate(y) / 100;
    accountBalance += accountBalance * interestRate;
  }

  // ========== 第三步：计算平均缴费指数 ==========

  const averageWageIndex = totalMonthsPaid > 0
    ? weightedIndexSum / totalMonthsPaid
    : 1.0;

  // ========== 第四步：计算退休时社平工资 ==========

  // 取最后一条记录的社平工资作为基准，或默认 8000
  const lastAvgWage = sortedRecords.length > 0
    ? sortedRecords[sortedRecords.length - 1].data.avgWage
    : 8000;

  // 推算到退休时的社平工资（按最近几年的平均增长率）
  const recentYears = sortedRecords.slice(-3);
  let avgGrowthRate = 0.05; // 默认 5%
  if (recentYears.length >= 2) {
    const growthRates = [];
    for (let i = 1; i < recentYears.length; i++) {
      const prev = recentYears[i - 1].data.avgWage;
      const curr = recentYears[i].data.avgWage;
      if (prev > 0) growthRates.push((curr - prev) / prev);
    }
    if (growthRates.length > 0) {
      avgGrowthRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
    }
  }

  const retirementAvgWage = lastAvgWage * Math.pow(1 + avgGrowthRate, retirementYear - lastRecordYear);

  // ========== 第五步：计算各项养老金 ==========

  // 1. 基础养老金
  const totalYears = totalYearsPaid + cfg.deemedYears;
  const basicPension = retirementAvgWage * (1 + averageWageIndex) / 2 * totalYears * 0.01;

  // 2. 个人账户养老金
  const payoutM = getPayoutMonths(retirementAge);
  const personalPension = accountBalance / payoutM;

  // 3. 过渡性养老金（中人）
  let transitionalPension = 0;
  if (cfg.hasTransitionalPension && cfg.deemedYears > 0) {
    transitionalPension = retirementAvgWage * cfg.deemedIndex * cfg.deemedYears * (cfg.transitionalRate / 100);
  }

  // 月养老金总额
  const monthlyPension = basicPension + personalPension + transitionalPension;
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
    transitionalPension: Math.round(transitionalPension),
    totalYearsPaid: Math.round(totalYearsPaid * 10) / 10,
    totalDeemedYears: cfg.deemedYears,
    totalYears: Math.round(totalYears * 10) / 10,
    averageWageIndex: Math.round(averageWageIndex * 100) / 100,
    personalAccountBalance: Math.round(accountBalance),
    retirementAvgWage: Math.round(retirementAvgWage),
    yearlyDetails,
  };
}

/**
 * 计算资产充足性
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

/**
 * 从缴费阶段展开为逐年缴存记录
 */
export function expandPhasesToRecords(
  phases: PensionPhase[],
  retirementYear: number
): PensionRecord[] {
  const records: PensionRecord[] = [];
  const now = new Date().toISOString();

  for (const phase of phases) {
    // 1. 展开在职阶段
    for (let year = phase.startYear; year <= Math.min(phase.endYear, retirementYear); year++) {
      const monthlyPersonal = Math.round(phase.monthlyBase * (phase.personalRate / 100));
      const monthlyEmployer = Math.round(phase.monthlyBase * (phase.employerRate / 100));
      records.push({
        _id: `phase_${phase.id}_${year}`,
        type: 'pension_record',
        createdAt: now,
        updatedAt: now,
        data: {
          year,
          monthlyBase: phase.monthlyBase,
          avgWage: phase.avgWage,
          personalRate: phase.personalRate,
          monthlyPersonal,
          employerRate: phase.employerRate,
          monthlyEmployer,
          monthsPaid: phase.monthsPaidPerYear,
          totalPaid: (monthlyPersonal + monthlyEmployer) * phase.monthsPaidPerYear,
          pensionType: 'basic',
          description: phase.description,
        },
      });
    }

    // 2. 灵活就业自动推算
    if (phase.autoFlexEmployment) {
      const flexStartYear = phase.endYear + 1;
      const flexEndYear = retirementYear;
      const basePercent = phase.flexBasePercent || 60;

      for (let year = flexStartYear; year <= flexEndYear; year++) {
        // 推算当年社平工资（按5%增长率）
        const yearsDiff = year - phase.endYear;
        const yearAvgWage = Math.round(phase.avgWage * Math.pow(1.05, yearsDiff));
        const flexBase = Math.round(yearAvgWage * basePercent / 100);

        // 灵活就业：总比例20%，其中8%入个人账户，12%入统筹
        const monthlyPersonal = Math.round(flexBase * 0.08);
        const monthlyEmployer = Math.round(flexBase * 0.12);

        records.push({
          _id: `phase_${phase.id}_flex_${year}`,
          type: 'pension_record',
          createdAt: now,
          updatedAt: now,
          data: {
            year,
            monthlyBase: flexBase,
            avgWage: yearAvgWage,
            personalRate: 8,
            monthlyPersonal,
            employerRate: 12,
            monthlyEmployer,
            monthsPaid: 12,
            totalPaid: (monthlyPersonal + monthlyEmployer) * 12,
            pensionType: 'basic',
            description: '灵活就业缴费',
          },
        });
      }
    }
  }

  return records;
}
