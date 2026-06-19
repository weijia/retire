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
  payoutMonths: number;             // 计发月数
  avgGrowthRate: number;            // 社平工资增长率

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
  currentYear: number,
  avgWageMap?: Map<number, number> // 年份 -> 月社平工资
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

  const retirementAge = cfg.retirementAge || 60;
  const deemedYears = cfg.deemedYears || 0;
  const retirementYear = currentYear + (retirementAge - currentAge);

  // ========== 第一步：逐年计算个人账户累积 ==========

  // 按年份排序
  const sortedRecords = [...records].sort((a, b) => a.data.year - b.data.year);

  let accountBalance = 0; // 历年明细从 0 开始
  let totalYearsPaid = 0;
  let totalMonthsPaid = 0;
  let weightedIndexSum = 0;
  const yearlyDetails: YearlyDetail[] = [];

  for (const record of sortedRecords) {
    const d = record.data;
    const year = d.year;

    // 优先使用导入的社平工资数据
    const avgWage = avgWageMap?.get(year) ?? d.avgWage;

    // 当年的缴费指数 = 缴费基数 / 社平工资
    const wageIndex = avgWage > 0 ? d.monthlyBase / avgWage : 1.0;

    // 当年个人缴费总额
    const monthsPaid = d.monthsPaid ?? 0;
    const personalContribution = d.monthlyPersonal * monthsPaid;

    // 计入个人账户（当年缴费在年底一次性计入，然后计算利息）
    accountBalance += personalContribution;

    // 当年利息（按年底余额计算年度利息）
    const interestRate = getInterestRate(year) / 100;
    const interest = accountBalance * interestRate;
    accountBalance += interest;

    // 累计统计
    totalYearsPaid += monthsPaid / 12;
    totalMonthsPaid += monthsPaid;
    weightedIndexSum += wageIndex * monthsPaid;

    yearlyDetails.push({
      year,
      monthlyBase: d.monthlyBase,
      avgWage,
      wageIndex: Math.round(wageIndex * 100) / 100,
      monthsPaid: d.monthsPaid,
      personalContribution,
      accountBalanceEOY: Math.round(accountBalance),
    });
  }

  // ========== 第二步：当前余额 + 计算到退休时的个人账户增长 ==========

  // 如果用户填写了当前实际个人账户余额，用它替代历年推算的累积值
  // 但保留灵活就业等后续阶段的缴费贡献
  if (cfg.currentPensionBalance && cfg.currentPensionBalance > 0) {
    // 找到最后一条"已有"记录（PDF导入的，非阶段展开的）
    // 灵活就业阶段的记录从 currentPensionBalance 之后继续累积
    const lastPdfYear = sortedRecords
      .filter(r => !r._id.startsWith('phase_'))
      .reduce((max, r) => Math.max(max, r.data.year), 0);

    // 重新计算：从 currentPensionBalance 开始，只计算灵活就业阶段的贡献
    if (lastPdfYear > 0 && lastPdfYear < sortedRecords[sortedRecords.length - 1]?.data.year) {
      accountBalance = cfg.currentPensionBalance;
      // currentPensionBalance 到 lastPdfYear+1 之间的利息
      for (let y = lastPdfYear + 1; y <= currentYear; y++) {
        const interestRate = getInterestRate(y) / 100;
        accountBalance += accountBalance * interestRate;
      }
      // 从 lastPdfYear+1 开始重新累积后续阶段的缴费
      for (const record of sortedRecords) {
        if (record.data.year <= lastPdfYear) continue;
        const d = record.data;
        const monthsPaid = d.monthsPaid ?? 0;
        accountBalance += d.monthlyPersonal * monthsPaid;
        const interestRate = getInterestRate(d.year) / 100;
        accountBalance += accountBalance * interestRate;
      }
    } else {
      // 没有后续阶段，直接用 currentPensionBalance
      accountBalance = cfg.currentPensionBalance;
    }
  }

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

  // 始终从 avgWageMap 中最新年份的数据推算，不依赖记录中的值
  let lastAvgWage = 8000;
  let lastKnownYear = 0;
  if (avgWageMap && avgWageMap.size > 0) {
    // 取 avgWageMap 中最新的年份
    for (const [year, wage] of avgWageMap.entries()) {
      if (year > lastKnownYear) {
        lastKnownYear = year;
        lastAvgWage = wage;
      }
    }
  } else if (sortedRecords.length > 0) {
    // 没有 avgWageMap 时用记录中的值
    lastAvgWage = sortedRecords[sortedRecords.length - 1].data.avgWage;
    lastKnownYear = sortedRecords[sortedRecords.length - 1].data.year;
  }

  // 如果没有找到任何数据，用当前年份
  if (lastKnownYear === 0) {
    lastKnownYear = currentYear;
  }

  // 推算到退休时的社平工资
  // 使用全部历史数据计算复合年增长率（CAGR），比只看最近3年更稳定
  let avgGrowthRate = 0.05; // 默认 5%
  if (avgWageMap && avgWageMap.size >= 2) {
    const sortedWageYears = Array.from(avgWageMap.entries())
      .map(([year, wage]) => ({ year, wage }))
      .sort((a, b) => a.year - b.year);

    // 取最早和最晚的数据计算 CAGR
    const first = sortedWageYears[0];
    const last = sortedWageYears[sortedWageYears.length - 1];
    const yearSpan = last.year - first.year;
    if (yearSpan > 0 && first.wage > 0) {
      avgGrowthRate = Math.pow(last.wage / first.wage, 1 / yearSpan) - 1;
    }
  }

  const retirementAvgWage = lastAvgWage * Math.pow(1 + avgGrowthRate, retirementYear - lastKnownYear);

  // ========== 第五步：计算各项养老金 ==========

  // 1. 基础养老金
  const totalYears = totalYearsPaid + deemedYears;
  const basicPension = retirementAvgWage * (1 + averageWageIndex) / 2 * totalYears * 0.01;

  // 2. 个人账户养老金
  const payoutM = getPayoutMonths(retirementAge);
  const personalPension = accountBalance / payoutM;

  // 3. 过渡性养老金（中人）
  let transitionalPension = 0;
  if (cfg.hasTransitionalPension && deemedYears > 0) {
    transitionalPension = retirementAvgWage * (cfg.deemedIndex || 1.0) * deemedYears * ((cfg.transitionalRate || 1.3) / 100);
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
    totalDeemedYears: deemedYears,
    totalYears: Math.round(totalYears * 10) / 10,
    averageWageIndex: Math.round(averageWageIndex * 100) / 100,
    personalAccountBalance: Math.round(accountBalance),
    retirementAvgWage: Math.round(retirementAvgWage),
    payoutMonths: payoutM,
    avgGrowthRate: Math.round(avgGrowthRate * 1000) / 10,
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
  retirementYear: number,
  avgWageMap?: Map<number, number>
): PensionRecord[] {
  const records: PensionRecord[] = [];
  const now = new Date().toISOString();

  for (const phase of phases) {
    const isFlex = phase.phaseType === 'flex';

    if (isFlex) {
      // 灵活就业阶段：缴费基数 = 社平工资 × 档次比例
      const basePercent = phase.flexBasePercent || 60;

      for (let year = phase.startYear; year <= Math.min(phase.endYear, retirementYear); year++) {
        // 优先使用导入的社平工资，否则按 5% 增长推算
        let yearAvgWage = avgWageMap?.get(year);
        if (!yearAvgWage) {
          const baseWage = phase.avgWage || 8000;
          const yearsDiff = year - phase.startYear;
          yearAvgWage = Math.round(baseWage * Math.pow(1.05, yearsDiff));
        }
        const flexBase = Math.round(yearAvgWage * basePercent / 100);

        // 灵活就业：总比例 20%，其中 8% 入个人账户，12% 入统筹
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
            monthsPaid: phase.monthsPaidPerYear || 12,
            totalPaid: (monthlyPersonal + monthlyEmployer) * (phase.monthsPaidPerYear || 12),
            pensionType: 'basic',
            description: phase.description || '灵活就业缴费',
          },
        });
      }
    } else {
      // 在职阶段
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

      // 在职阶段结束后自动转灵活就业（向后兼容）
      if (phase.autoFlexEmployment) {
        const flexStartYear = phase.endYear + 1;
        const flexEndYear = retirementYear;
        const basePercent = phase.flexBasePercent || 60;

        for (let year = flexStartYear; year <= flexEndYear; year++) {
          let yearAvgWage = avgWageMap?.get(year);
          if (!yearAvgWage) {
            const yearsDiff = year - phase.endYear;
            yearAvgWage = Math.round(phase.avgWage * Math.pow(1.05, yearsDiff));
          }
          const flexBase = Math.round(yearAvgWage * basePercent / 100);

          const monthlyPersonal = Math.round(flexBase * 0.08);
          const monthlyEmployer = Math.round(flexBase * 0.12);

          records.push({
            _id: `phase_${phase.id}_auto_flex_${year}`,
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
              description: '灵活就业缴费（自动续缴）',
            },
          });
        }
      }
    }
  }

  return records;
}
