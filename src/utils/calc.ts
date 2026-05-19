// 计算退休年份
export function calcRetireYear(birthYear: number, targetAge: number): number {
  return birthYear + targetAge;
}

// 计算距离退休的剩余天数（假设生日在年中）
export function calcDaysToRetire(birthYear: number, targetAge: number): number {
  const retireYear = calcRetireYear(birthYear, targetAge);
  // 假设生日在年中（7月1日）
  const retireDate = new Date(retireYear, 6, 1); // 月份从0开始，6表示7月
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  retireDate.setHours(0, 0, 0, 0);
  const diff = retireDate.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// 计算剩余年数（简化版，基于年份计算）
export function calcYearsToRetire(birthYear: number, targetAge: number): number {
  const retireYear = calcRetireYear(birthYear, targetAge);
  const currentYear = new Date().getFullYear();
  const years = retireYear - currentYear;
  return Math.max(0, years);
}

// 计算总资产
export function calcTotalAssets(accounts: { balance: number; isHidden: boolean }[]): number {
  return accounts
    .filter(a => !a.isHidden)
    .reduce((sum, a) => sum + a.balance, 0);
}

// 按类型汇总资产
export function calcAssetsByType(accounts: { accountType: string; balance: number; isHidden: boolean }[]): Record<string, number> {
  return accounts
    .filter(a => !a.isHidden)
    .reduce((acc, a) => {
      acc[a.accountType] = (acc[a.accountType] || 0) + a.balance;
      return acc;
    }, {} as Record<string, number>);
}

// 计算月度消费总额
export function calcMonthlyTotal(records: { amount: number }[]): number {
  return records.reduce((sum, r) => sum + r.amount, 0);
}

// 计算消费进度百分比
export function calcExpenseProgress(actual: number, planned: number): number {
  if (planned <= 0) return 0;
  return Math.min(100, Math.round((actual / planned) * 100));
}

// 计算退休时预计资产（停止工作时）
// = 当前总资产 + (预期年收入 × 距退休年数) - (年均计划支出 × 距退休年数)
export function calcRetirementAssets(
  currentAssets: number,
  annualIncome: number,
  annualExpense: number,
  yearsToRetire: number
): number {
  if (yearsToRetire <= 0) return currentAssets;
  return currentAssets + (annualIncome - annualExpense) * yearsToRetire;
}

// 计算空窗期消耗
// 空窗期 = 目标退休年龄 到 实际退休年龄（领退休金）之间
// 这段时间没有工作收入，纯靠积蓄生活
export function calcGapPeriodConsumption(
  retirementAssets: number,
  annualExpense: number,
  gapYears: number
): { remaining: number; totalConsumption: number } {
  if (gapYears <= 0) return { remaining: retirementAssets, totalConsumption: 0 };
  const totalConsumption = annualExpense * gapYears;
  const remaining = retirementAssets - totalConsumption;
  return { remaining, totalConsumption };
}
