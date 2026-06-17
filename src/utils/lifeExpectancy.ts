import type { HealthProfile, HealthDailyRecord } from '../types';

// ==================== 中国生命表数据（简化版） ====================
// 数据来源参考：中国国家统计局 + WHO Global Health Observatory
// 按性别和年龄查表获取基准剩余预期寿命
const lifeTable: Record<string, number[]> = {
  male: [
    73.6, 72.9, 72.0, 71.0, 70.1, 69.1, 68.2, 67.2, 66.2, 65.3,
    64.3, 63.3, 62.3, 61.4, 60.4, 59.4, 58.4, 57.4, 56.5, 55.5,
    54.5, 53.5, 52.6, 51.6, 50.6, 49.7, 48.7, 47.7, 46.8, 45.8,
    44.8, 43.9, 42.9, 42.0, 41.0, 40.1, 39.1, 38.2, 37.2, 36.3,
    35.3, 34.4, 33.5, 32.5, 31.6, 30.7, 29.8, 28.8, 27.9, 27.0,
    26.1, 25.2, 24.3, 23.4, 22.5, 21.7, 20.8, 19.9, 19.1, 18.2,
    17.4, 16.5, 15.7, 14.9, 14.0, 13.2, 12.4, 11.6, 10.9, 10.1,
    9.3, 8.6, 7.8, 7.1, 6.4, 5.7, 5.1, 4.5, 3.9, 3.3,
    2.8, 2.3, 1.9, 1.5, 1.2, 0.9, 0.7, 0.5, 0.3, 0.2,
    0.1, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  ],
  female: [
    79.4, 78.6, 77.7, 76.7, 75.8, 74.8, 73.9, 72.9, 71.9, 71.0,
    70.0, 69.0, 68.0, 67.1, 66.1, 65.1, 64.1, 63.2, 62.2, 61.2,
    60.2, 59.3, 58.3, 57.3, 56.4, 55.4, 54.4, 53.5, 52.5, 51.5,
    50.6, 49.6, 48.7, 47.7, 46.8, 45.8, 44.9, 43.9, 43.0, 42.0,
    41.1, 40.2, 39.2, 38.3, 37.4, 36.5, 35.6, 34.6, 33.7, 32.8,
    31.9, 31.0, 30.1, 29.3, 28.4, 27.5, 26.6, 25.8, 24.9, 24.1,
    23.2, 22.4, 21.6, 20.7, 19.9, 19.1, 18.3, 17.5, 16.7, 15.9,
    15.1, 14.4, 13.6, 12.9, 12.1, 11.4, 10.7, 10.0, 9.3, 8.6,
    8.0, 7.3, 6.7, 6.1, 5.5, 5.0, 4.4, 3.9, 3.4, 3.0,
    2.5, 2.1, 1.8, 1.4, 1.1, 0.9, 0.6, 0.5, 0.3, 0.2,
  ],
};

/**
 * 获取基准剩余预期寿命
 * @param age 当前年龄
 * @param gender 性别
 */
export function getBaselineLifeExpectancy(age: number, gender: 'male' | 'female'): number {
  const clampedAge = Math.max(0, Math.min(99, Math.floor(age)));
  return lifeTable[gender][clampedAge] || 0;
}

// ==================== 因素权重定义 ====================

interface FactorConfig {
  name: string;
  weight: number; // 最大调整年数
  scoreFn: (profile: HealthProfile['data']) => number; // 返回 -1 到 1
}

const factors: FactorConfig[] = [
  {
    name: '吸烟',
    weight: -10,
    scoreFn: (d) => {
      if (d.smokingStatus === 'never') return 0;
      if (d.smokingStatus === 'former') {
        // 已戒烟：烟龄越短、戒烟越久影响越小
        const quitYears = d.quitSmokingYears || 0;
        const recovery = Math.min(quitYears / 15, 1);
        return -0.3 * (1 - recovery);
      }
      // 当前吸烟者
      const cigs = d.cigarettesPerDay || 0;
      if (cigs <= 5) return -0.4;
      if (cigs <= 15) return -0.7;
      return -1.0;
    },
  },
  {
    name: '饮酒',
    weight: -3.5,
    scoreFn: (d) => {
      if (d.drinkingStatus === 'never' || d.drinkingStatus === 'occasional') return 0;
      const drinks = d.drinksPerWeek || 0;
      if (d.drinkingStatus === 'regular') {
        if (drinks <= 7) return 0;
        return -Math.min((drinks - 7) / 21, 1.0);
      }
      // heavy
      return -Math.min(drinks / 28, 1.0);
    },
  },
  {
    name: '饮食结构',
    weight: 2,
    scoreFn: (d) => {
      let score = 0;
      // 蔬果摄入
      const veg = d.fruitVegServingsPerDay || 0;
      if (veg >= 5) score += 0.3;
      else if (veg >= 3) score += 0.15;
      else if (veg < 2) score -= 0.2;

      // 红肉
      const redMeat = d.redMeatFreqPerWeek || 0;
      if (redMeat <= 2) score += 0.15;
      else if (redMeat >= 5) score -= 0.15;

      // 加工食品
      const processed = d.processedFoodFreqPerWeek || 0;
      if (processed <= 1) score += 0.15;
      else if (processed >= 4) score -= 0.2;

      // 含糖饮料
      const sugar = d.sugarDrinkFreqPerWeek || 0;
      if (sugar === 0) score += 0.1;
      else if (sugar >= 5) score -= 0.15;

      // 整体饮食模式
      if (d.dietPattern === 'healthy') score += 0.15;
      else if (d.dietPattern === 'unhealthy') score -= 0.2;

      return Math.max(-1, Math.min(1, score));
    },
  },
  {
    name: '运动',
    weight: 4.5,
    scoreFn: (d) => {
      const weeklyMinutes = (d.exerciseFreqPerWeek || 0) * (d.exerciseMinutesPerSession || 0);
      if (weeklyMinutes >= 300) return 1.0;
      if (weeklyMinutes >= 150) return 0.7;
      if (weeklyMinutes >= 60) return 0.4;
      if (weeklyMinutes >= 30) return 0.2;
      if (weeklyMinutes > 0) return 0.1;

      // 久坐扣分
      const sedentary = d.sedentaryHoursPerDay || 0;
      if (sedentary > 10) return -0.5;
      if (sedentary > 8) return -0.3;
      if (sedentary > 6) return -0.1;
      return 0;
    },
  },
  {
    name: 'BMI',
    weight: -4,
    scoreFn: (d) => {
      if (!d.height || !d.weight) return 0;
      const bmi = d.weight / Math.pow(d.height / 100, 2);
      if (bmi >= 18.5 && bmi <= 24.9) return 0;
      if (bmi < 18.5) return -0.3;
      const excess = bmi - 24.9;
      return -Math.min(Math.pow(excess / 15, 1.3), 1.0);
    },
  },
  {
    name: '睡眠',
    weight: 1,
    scoreFn: (d) => {
      const sleep = d.sleepHoursPerDay || 0;
      if (sleep >= 7 && sleep <= 8) return 0.5;
      if (sleep >= 6 && sleep < 7) return 0.2;
      if (sleep > 8 && sleep <= 9) return 0.1;
      if (sleep < 6) return -0.5;
      if (sleep > 9) return -0.2;
      return 0;
    },
  },
  {
    name: '压力',
    weight: -1,
    scoreFn: (d) => {
      const stress = d.stressLevel || 0;
      if (stress <= 3) return 0;
      if (stress <= 5) return -0.2;
      if (stress <= 7) return -0.5;
      return -1.0;
    },
  },
  {
    name: '空气质量',
    weight: -1,
    scoreFn: (d) => {
      if (d.airQuality === 'good') return 0;
      if (d.airQuality === 'moderate') return -0.3;
      return -0.8;
    },
  },
  {
    name: '慢性病',
    weight: -5,
    scoreFn: (d) => {
      let conditions = 0;
      if (d.hasDiabetes) conditions++;
      if (d.hasHypertension) conditions++;
      if (d.hasHeartDisease) conditions++;
      if (d.hasStroke) conditions++;
      if (d.hasCancer) conditions++;
      return -Math.min(conditions * 0.3, 1.0);
    },
  },
  {
    name: '家族史',
    weight: 2,
    scoreFn: (d) => {
      let score = 0;
      if (d.familyHistoryLongevity) score += 0.5;
      if (d.familyHistoryHeartDisease) score -= 0.3;
      if (d.familyHistoryCancer) score -= 0.3;
      return Math.max(-1, Math.min(1, score));
    },
  },
];

// ==================== 每日记录影响值 ====================

// 每条记录的即时影响（天）
export const dailyRecordImpact: Record<string, (quantity?: number) => number> = {
  smoking: (qty = 1) => -0.02 * qty, // 每根烟 -0.02天
  alcohol: (qty = 1) => -0.05 * qty, // 每杯 -0.05天
  exercise: (qty = 30) => 0.5 * (qty / 30), // 每30分钟 +0.5天
  high_calorie: (qty = 1) => -0.1 * qty, // 每次 -0.1天
  junk_food: (qty = 1) => -0.08 * qty, // 每次 -0.08天
  diet: (_qty = 1) => 0, // 通用饮食记录，由描述决定
  sleep: (qty = 7) => {
    if (qty < 6) return -0.3;
    if (qty >= 7 && qty <= 8) return 0.1;
    return 0;
  },
  other: () => 0,
};

/**
 * 计算每日记录的累计影响（年）
 * 采用衰减累积模型
 */
function calculateDailyAdjustment(records: HealthDailyRecord[]): number {
  const now = new Date();
  const lambda = 0.03; // 衰减速率

  let totalDays = 0;

  for (const record of records) {
    const recordDate = new Date(record.data.date);
    const daysDiff = Math.max(0, (now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
    const decayFactor = Math.exp(-lambda * daysDiff);
    totalDays += record.data.impact * decayFactor;
  }

  return totalDays / 365;
}

/**
 * 限制调整范围
 */
function clampAdjustment(adjustment: number, maxAbs: number): number {
  return Math.max(-maxAbs, Math.min(maxAbs, adjustment));
}

// ==================== 计算结果接口 ====================

export interface LifeExpectancyResult {
  baselineYears: number;        // 基准剩余寿命（年）
  adjustedYears: number;        // 调整后剩余寿命（年）
  baselineTotalAge: number;     // 基准总预期寿命 = 当前年龄 + 基准剩余寿命
  adjustedTotalAge: number;     // 调整后总预期寿命 = 当前年龄 + 调整后剩余寿命
  totalAdjustmentDays: number;
  profileAdjustmentDays: number;
  dailyAdjustmentDays: number;
  breakdown: { factorName: string; adjustmentDays: number }[];
}

/**
 * 计算预期寿命
 * @param profile 健康画像
 * @param dailyRecords 每日健康记录
 * @param currentAge 当前年龄
 * @param gender 性别
 */
export function calculateLifeExpectancy(
  profile: HealthProfile | null,
  dailyRecords: HealthDailyRecord[],
  currentAge: number,
  gender: 'male' | 'female'
): LifeExpectancyResult {
  // 1. 获取基准寿命
  const baseline = getBaselineLifeExpectancy(currentAge, gender);

  // 2. 计算健康画像调整
  let profileAdjustment = 0;
  const breakdown: { factorName: string; adjustmentDays: number }[] = [];

  if (profile) {
    for (const factor of factors) {
      const score = factor.scoreFn(profile.data);
      const adjustment = factor.weight * score;
      profileAdjustment += adjustment;
      breakdown.push({
        factorName: factor.name,
        adjustmentDays: Math.round(adjustment * 365 * 10) / 10,
      });
    }
  }

  // 3. 计算每日记录调整
  const dailyAdjustment = calculateDailyAdjustment(dailyRecords);

  // 4. 合并并限制
  const maxAdjustment = baseline * 0.25;
  const totalAdjustment = clampAdjustment(profileAdjustment + dailyAdjustment, maxAdjustment);

  // 5. 添加每日记录到明细
  if (dailyAdjustment !== 0) {
    breakdown.push({
      factorName: '每日记录',
      adjustmentDays: Math.round(dailyAdjustment * 365 * 10) / 10,
    });
  }

  return {
    baselineYears: Math.round(baseline * 10) / 10,
    adjustedYears: Math.round((baseline + totalAdjustment) * 10) / 10,
    baselineTotalAge: Math.round((currentAge + baseline) * 10) / 10,
    adjustedTotalAge: Math.round((currentAge + baseline + totalAdjustment) * 10) / 10,
    totalAdjustmentDays: Math.round(totalAdjustment * 365 * 10) / 10,
    profileAdjustmentDays: Math.round(profileAdjustment * 365 * 10) / 10,
    dailyAdjustmentDays: Math.round(dailyAdjustment * 365 * 10) / 10,
    breakdown: breakdown.sort((a, b) => b.adjustmentDays - a.adjustmentDays),
  };
}

/**
 * 计算单条每日记录的即时影响值
 */
export function calculateRecordImpact(
  category: string,
  quantity?: number
): number {
  const fn = dailyRecordImpact[category];
  if (fn) return fn(quantity);
  return 0;
}

/**
 * 生成改善建议
 */
export function generateSuggestions(
  profile: HealthProfile | null,
  _result: LifeExpectancyResult
): string[] {
  const suggestions: string[] = [];
  if (!profile) return suggestions;

  const d = profile.data;

  // 吸烟建议
  if (d.smokingStatus === 'current') {
    suggestions.push('戒烟可延长寿命约3-10年，越早戒烟恢复越多');
  }

  // 运动建议
  const weeklyMinutes = (d.exerciseFreqPerWeek || 0) * (d.exerciseMinutesPerSession || 0);
  if (weeklyMinutes < 150) {
    const needed = 150 - weeklyMinutes;
    suggestions.push(`每周再运动约${needed}分钟可显著延长寿命`);
  }

  // BMI建议
  if (d.height && d.weight) {
    const bmi = d.weight / Math.pow(d.height / 100, 2);
    if (bmi > 25) {
      suggestions.push(`BMI为${bmi.toFixed(1)}，减重至正常范围可延长寿命`);
    }
  }

  // 饮食建议
  if (d.processedFoodFreqPerWeek >= 3) {
    suggestions.push('减少加工食品摄入，选择天然食材');
  }
  if (d.fruitVegServingsPerDay < 3) {
    suggestions.push('增加蔬果摄入至每日5份以上');
  }

  // 睡眠建议
  if (d.sleepHoursPerDay < 6 || d.sleepHoursPerDay > 9) {
    suggestions.push('保持每日7-8小时睡眠有助于延长寿命');
  }

  // 压力建议
  if (d.stressLevel > 7) {
    suggestions.push('长期高压影响健康，建议通过运动、冥想等方式减压');
  }

  return suggestions.slice(0, 5);
}
