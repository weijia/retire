// 基础文档接口
export interface BaseDocument {
  _id: string;
  _rev?: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

// 用户配置
export interface UserConfig extends BaseDocument {
  type: 'user_config';
  data: {
    birthYear: number;  // 出生年份
    targetRetireAge: number;
    actualRetireAge: number;
    gender: 'male' | 'female';
  };
}

// 账户类型
export type AccountType =
  | 'alipay'
  | 'bank_deposit'
  | 'fund'
  | 'stock'
  | 'pension'
  | 'salary_income'
  | 'other';

// 账户类型中文映射
export const AccountTypeLabels: Record<AccountType, string> = {
  alipay: '支付宝',
  bank_deposit: '银行存款',
  fund: '基金',
  stock: '股票',
  pension: '养老金账户',
  salary_income: '工资收入',
  other: '其他',
};

// 资产账户
export interface AssetAccount extends BaseDocument {
  type: 'asset_account';
  data: {
    name: string;
    accountType: AccountType;
    balance: number;
    currency: string;
    description?: string;
    bankName?: string;
    fundCode?: string;
    stockCode?: string;
    isHidden: boolean;
  };
}

// 消费计划类别
export type ExpenseCategory =
  | 'supplementary_medical'
  | 'social_pension'
  | 'medical_insurance'
  | 'family_fixed'
  | 'personal_fixed'
  | 'personal_flexible';

export const ExpenseCategoryLabels: Record<ExpenseCategory, string> = {
  supplementary_medical: '补充医疗保险',
  social_pension: '社保（养老金）',
  medical_insurance: '医保固定支出',
  family_fixed: '家庭固定支出',
  personal_fixed: '个人固定支出',
  personal_flexible: '个人灵活支出',
};

// 消费计划
export interface ExpensePlan extends BaseDocument {
  type: 'expense_plan';
  data: {
    name: string;
    year: number;
    category: ExpenseCategory;
    annualAmount: number;
    monthlyAmount: number;
    frequency: 'monthly' | 'quarterly' | 'yearly' | 'onetime';
    description?: string;
    isActive: boolean;
    isFixed: boolean;
  };
}

// 实际消费记录类别
export type ExpenseRecordCategory =
  | 'supplementary_medical'
  | 'social_pension'
  | 'medical_insurance'
  | 'family_fixed'
  | 'personal_fixed'
  | 'personal_flexible'
  | 'daily_food'
  | 'daily_transport'
  | 'daily_shopping'
  | 'daily_entertainment'
  | 'daily_housing'
  | 'daily_other';

export const ExpenseRecordCategoryLabels: Record<ExpenseRecordCategory, string> = {
  supplementary_medical: '补充医疗保险',
  social_pension: '社保（养老金）',
  medical_insurance: '医保固定支出',
  family_fixed: '家庭固定支出',
  personal_fixed: '个人固定支出',
  personal_flexible: '个人灵活支出',
  daily_food: '日常餐饮',
  daily_transport: '日常交通',
  daily_shopping: '日常购物',
  daily_entertainment: '日常娱乐',
  daily_housing: '日常住房',
  daily_other: '其他日常支出',
};

// 消费记录
export interface ExpenseRecord extends BaseDocument {
  type: 'expense_record';
  data: {
    date: string;
    amount: number;
    category: ExpenseRecordCategory;
    description: string;
    paymentMethod?: string;
    linkedPlanId?: string;
    tags?: string[];
  };
}

// ==================== 健康相关类型 ====================

// 吸烟状态
export type SmokingStatus = 'never' | 'former' | 'current';

// 饮酒状态
export type DrinkingStatus = 'never' | 'occasional' | 'regular' | 'heavy';

// 饮食模式
export type DietPattern = 'healthy' | 'average' | 'unhealthy';

// 空气质量
export type AirQuality = 'good' | 'moderate' | 'poor';

// 每日记录类别
export type DailyRecordCategory =
  | 'smoking'
  | 'alcohol'
  | 'diet'
  | 'exercise'
  | 'sleep'
  | 'high_calorie'
  | 'junk_food'
  | 'other';

export const DailyRecordCategoryLabels: Record<DailyRecordCategory, string> = {
  smoking: '吸烟',
  alcohol: '饮酒',
  diet: '饮食',
  exercise: '运动',
  sleep: '睡眠',
  high_calorie: '高热量食物',
  junk_food: '垃圾食品',
  other: '其他',
};

export const DailyRecordCategoryIcons: Record<DailyRecordCategory, string> = {
  smoking: '🚬',
  alcohol: '🍺',
  diet: '🥗',
  exercise: '🏃',
  sleep: '😴',
  high_calorie: '🍔',
  junk_food: '🍟',
  other: '📝',
};

// 健康画像
export interface HealthProfile extends BaseDocument {
  type: 'health_profile';
  data: {
    smokingStatus: SmokingStatus;
    cigarettesPerDay?: number;
    smokingYears?: number;
    quitSmokingYears?: number;
    drinkingStatus: DrinkingStatus;
    drinksPerWeek?: number;
    dietPattern: DietPattern;
    fruitVegServingsPerDay: number;
    redMeatFreqPerWeek: number;
    processedFoodFreqPerWeek: number;
    sugarDrinkFreqPerWeek: number;
    exerciseFreqPerWeek: number;
    exerciseMinutesPerSession: number;
    sedentaryHoursPerDay: number;
    height: number;
    weight: number;
    sleepHoursPerDay: number;
    stressLevel: number;
    airQuality: AirQuality;
    hasDiabetes: boolean;
    hasHypertension: boolean;
    hasHeartDisease: boolean;
    hasStroke: boolean;
    hasCancer: boolean;
    familyHistoryLongevity: boolean;
    familyHistoryHeartDisease: boolean;
    familyHistoryCancer: boolean;
  };
}

// 每日健康记录
export interface HealthDailyRecord extends BaseDocument {
  type: 'health_daily_record';
  data: {
    date: string;
    category: DailyRecordCategory;
    description: string;
    impact: number;
    quantity?: number;
    calories?: number;
    metadata?: Record<string, any>;
  };
}

// 预期寿命快照
export interface LifeExpectancySnapshot extends BaseDocument {
  type: 'life_expectancy_snapshot';
  data: {
    date: string;
    baselineAge: number;
    adjustedAge: number;
    totalAdjustmentDays: number;
    profileAdjustmentDays: number;
    dailyAdjustmentDays: number;
    breakdown: {
      factorName: string;
      adjustmentDays: number;
    }[];
  };
}

// ==================== 养老金相关类型 ====================

// 养老金类型
export type PensionType = 'basic' | 'supplementary';

// 养老金缴存记录
export interface PensionRecord extends BaseDocument {
  type: 'pension_record';
  data: {
    year: number;
    monthlyBase: number;
    personalRate: number;
    monthlyPersonal: number;
    employerRate: number;
    monthlyEmployer: number;
    monthsPaid: number;
    totalPaid: number;
    pensionType: PensionType;
    description?: string;
  };
}

// 养老金测算配置
export interface PensionConfig extends BaseDocument {
  type: 'pension_config';
  data: {
    pensionType: 'basic' | 'supplementary' | 'both';
    currentPensionBalance: number;
    expectedPensionGrowthRate: number;
    averageWageGrowthRate: number;
    retirementAge: number;
    pensionReplaceRate: number;
  };
}

// Gitee 同步配置
export interface GiteeSyncConfig extends BaseDocument {
  type: 'gitee_sync_config';
  data: {
    token: string;
    owner: string;
    repo: string;
    branch: string;
    filePath: string;
  };
}

// 所有文档类型的联合类型
export type AppDocument =
  | UserConfig
  | AssetAccount
  | ExpensePlan
  | ExpenseRecord
  | HealthProfile
  | HealthDailyRecord
  | LifeExpectancySnapshot
  | PensionRecord
  | PensionConfig
  | GiteeSyncConfig;
