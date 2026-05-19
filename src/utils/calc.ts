// 计算退休日期
export function calcRetireDate(birthDate: string, targetAge: number): Date {
  const birth = new Date(birthDate);
  const retire = new Date(birth);
  retire.setFullYear(birth.getFullYear() + targetAge);
  return retire;
}

// 计算距离退休的剩余天数
export function calcDaysToRetire(birthDate: string, targetAge: number): number {
  const retire = calcRetireDate(birthDate, targetAge);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  retire.setHours(0, 0, 0, 0);
  const diff = retire.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// 计算剩余年月
export function calcYearsMonthsToRetire(birthDate: string, targetAge: number): { years: number; months: number } {
  const retire = calcRetireDate(birthDate, targetAge);
  const today = new Date();
  let years = retire.getFullYear() - today.getFullYear();
  let months = retire.getMonth() - today.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  if (retire.getDate() < today.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }
  return { years: Math.max(0, years), months: Math.max(0, months) };
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

// 计算距退休的精确年数（保留1位小数）
export function calcYearsToRetire(birthDate: string, targetAge: number): number {
  const retire = calcRetireDate(birthDate, targetAge);
  const today = new Date();
  const diffMs = retire.getTime() - today.getTime();
  if (diffMs <= 0) return 0;
  return Math.round((diffMs / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10;
}

// 计算退休时预计资产
// 退休时资产 = 当前总资产 + (预期年收入 × 距退休年数) - (年均计划支出 × 距退休年数)
export function calcRetirementAssets(
  currentAssets: number,
  annualIncome: number,
  annualExpense: number,
  yearsToRetire: number
): number {
  if (yearsToRetire <= 0) return currentAssets;
  return currentAssets + (annualIncome - annualExpense) * yearsToRetire;
}
