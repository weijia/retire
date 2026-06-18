# 退休倒计时应用 - 设计文档

## 1. 项目概述

### 1.1 项目名称
**retire** - 退休倒计时与财务规划应用

### 1.2 项目目标
帮助用户追踪距离退休的剩余时间，管理个人/家庭资产，制定消费计划，记录实际消费，从而实现科学的退休财务规划。

### 1.3 核心功能
1. **退休倒计时** - 根据用户配置的出生日期和目标退休年龄，实时显示倒计时
2. **资产管理** - 管理各类金融账户资产
3. **消费计划** - 制定年度/月度消费预算计划
4. **实际消费** - 记录日常消费支出
5. **预期寿命评估** - 基于用户生活习惯、饮食、运动等健康因素预测预期寿命，支持每日记录动态更新
6. **养老金测算** - 结合预期寿命与养老金缴存情况，计算退休后可领取的养老金总额及可领取年数

### 1.4 技术栈
| 层级 | 技术选型 |
|------|---------|
| 前端框架 | Vue 3 + Composition API |
| 开发语言 | TypeScript |
| 构建工具 | Vite |
| 数据库 | IndexedDB（通过 idb 库封装，浏览器端本地存储） |
| UI风格 | 移动端优先，响应式设计 |
| 路由 | Vue Router 4 |
| 状态管理 | Pinia |

---

## 2. 数据模型设计

### 2.1 PouchDB 文档结构约定

所有文档遵循以下基础结构：

```typescript
interface BaseDocument {
  _id: string;           // PouchDB 文档ID，格式: {type}_{uuid}
  _rev?: string;         // PouchDB 版本号
  type: string;          // 文档类型标识
  createdAt: string;     // ISO 8601 创建时间
  updatedAt: string;     // ISO 8601 更新时间
}
```

文档ID格式：`{类型前缀}_{UUID}`

---

### 2.2 用户配置（user_config）

```typescript
interface UserConfig extends BaseDocument {
  type: 'user_config';
  data: {
    name: string;              // 用户姓名
    birthDate: string;         // 出生日期 YYYY-MM-DD
    targetRetireAge: number;   // 目标退休年龄（默认60）
    gender: 'male' | 'female'; // 性别
  };
}
```

**文档ID**: `user_config_profile`

---

### 2.3 资产账户（asset_account）

```typescript
// 账户类型枚举
type AccountType =
  | 'alipay'       // 支付宝
  | 'bank_deposit' // 银行存款
  | 'fund'         // 基金
  | 'stock'        // 股票
  | 'pension'      // 养老金账户
  | 'other';       // 其他

interface AssetAccount extends BaseDocument {
  type: 'asset_account';
  data: {
    name: string;            // 账户名称（如：工商银行储蓄卡）
    accountType: AccountType; // 账户类型
    balance: number;         // 当前余额（元）
    currency: string;        // 货币类型，默认 CNY
    description?: string;    // 备注
    bankName?: string;       // 银行名称（银行存款类）
    fundCode?: string;       // 基金代码（基金类）
    stockCode?: string;      // 股票代码（股票类）
    isHidden: boolean;       // 是否隐藏（不计入总资产）
  };
}
```

**文档ID**: `asset_{uuid}`

**索引字段**: `data.accountType`, `data.isHidden`

---

### 2.4 消费计划（expense_plan）

```typescript
// 消费计划类别
type ExpenseCategory =
  | 'supplementary_medical'  // 补充医疗保险
  | 'social_pension'         // 社保养老金
  | 'medical_insurance'      // 医保固定支出
  | 'family_fixed'           // 家庭固定支出
  | 'personal_fixed'         // 个人固定支出
  | 'personal_flexible';     // 个人灵活支出

interface ExpensePlan extends BaseDocument {
  type: 'expense_plan';
  data: {
    year: number;              // 计划年份（如 2026）
    category: ExpenseCategory; // 消费类别
    name: string;              // 计划项名称
    annualAmount: number;      // 年度计划金额（元）
    monthlyAmount: number;     // 月度计划金额（元）= annualAmount / 12
    frequency: 'monthly' | 'quarterly' | 'yearly' | 'onetime'; // 缴费频率
    description?: string;      // 备注
    isActive: boolean;         // 是否启用
  };
}
```

**文档ID**: `plan_{uuid}`

**索引字段**: `data.year`, `data.category`, `data.isActive`

---

### 2.5 实际消费记录（expense_record）

```typescript
// 实际消费类别（与计划类别对应 + 额外日常类别）
type ExpenseRecordCategory =
  | 'supplementary_medical'  // 补充医疗保险
  | 'social_pension'         // 社保养老金
  | 'medical_insurance'      // 医保固定支出
  | 'family_fixed'           // 家庭固定支出
  | 'personal_fixed'         // 个人固定支出
  | 'personal_flexible'      // 个人灵活支出
  | 'daily_food'             // 日常餐饮
  | 'daily_transport'        // 日常交通
  | 'daily_shopping'         // 日常购物
  | 'daily_entertainment'    // 日常娱乐
  | 'daily_housing'          // 日常住房（水电物业等）
  | 'daily_other';           // 其他日常支出

interface ExpenseRecord extends BaseDocument {
  type: 'expense_record';
  data: {
    date: string;                    // 消费日期 YYYY-MM-DD
    amount: number;                  // 消费金额（元）
    category: ExpenseRecordCategory; // 消费类别
    description: string;             // 消费描述
    paymentMethod?: string;          // 支付方式（账户名称）
    linkedPlanId?: string;           // 关联的消费计划ID（如有）
    tags?: string[];                 // 标签
  };
}
```

**文档ID**: `expense_{uuid}`

**索引字段**: `data.date`, `data.category`, `data.linkedPlanId`

---

## 3. 数据库设计

### 3.1 数据库设计

使用浏览器原生 **IndexedDB**，通过 `idb` 库进行封装，提供 Promise 化的 API。

**数据库名称**: `retire_db`
**Object Store**: `documents`（主键: `_id`）

#### 索引设计

```javascript
// 在 openDB 的 upgrade 回调中创建
store.createIndex('type', 'type', { unique: false });
store.createIndex('createdAt', 'createdAt', { unique: false });
store.createIndex('data_accountType', 'data.accountType', { unique: false });
store.createIndex('data_year', 'data.year', { unique: false });
store.createIndex('data_category', 'data.category', { unique: false });
store.createIndex('data_date', 'data.date', { unique: false });
```

### 3.2 数据库操作封装

提供统一的 CRUD 服务（BaseService 类）：

```typescript
class BaseService<T> {
  create(data: T['data']): Promise<T>;
  update(id: string, changes: Partial<T['data']>): Promise<T>;
  remove(id: string): Promise<void>;
  getById(id: string): Promise<T | null>;
  getAll(): Promise<T[]>;
}
```

同时提供底层 API：
- `putDoc(doc)` - 创建/更新文档
- `getDoc(id)` - 获取单个文档
- `removeDoc(id)` - 删除文档
- `getAllDocs(type?)` - 按类型获取所有文档
- `queryByIndex(indexName, value)` - 按索引查询
- `exportDb()` / `importDb()` - 数据导出/导入

---

## 4. 页面与路由设计

### 4.1 路由表

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 首页（倒计时仪表盘） | 退休倒计时、预期寿命、养老金、资产总览、消费概览 |
| `/assets` | 资产管理列表 | 按类型分组展示所有资产账户 |
| `/assets/add` | 添加/编辑资产 | 资产账户表单 |
| `/plans` | 消费计划列表 | 按年份和类别展示消费计划 |
| `/plans/add` | 添加/编辑计划 | 消费计划表单 |
| `/expenses` | 消费记录列表 | 按日期展示消费记录 |
| `/expenses/add` | 添加消费记录 | 消费记录表单 |
| `/health` | 健康画像 | 填写/编辑健康基线数据 |
| `/health/daily` | 每日健康记录 | 每日追加生活习惯变化记录列表 |
| `/health/daily/add` | 添加每日记录 | 快速记录今日健康行为 |
| `/health/result` | 预期寿命结果 | 展示预期寿命预测结果与趋势 |
| `/pension` | 养老金测算 | 测算参数、缴费阶段管理、测算结果 |
| `/pension/phases/add` | 添加缴费阶段 | 新增缴费阶段表单 |
| `/pension/phases/edit/:id` | 编辑缴费阶段 | 编辑已有缴费阶段 |
| `/pension/records` | 缴存记录 | 展开后的逐年缴存记录 |
| `/pension/records/add` | 添加缴存记录 | 手动添加单年缴存记录 |
| `/pension/records/edit/:id` | 编辑缴存记录 | 编辑已有缴存记录 |
| `/pension/help` | 计算说明 | 公式说明、缴费比例对比、灵活就业档位分析 |
| `/settings` | 设置 | 用户信息、退休年龄配置、Gitee 同步配置 |

### 4.2 底部导航栏（移动端）

```
[首页] [资产] [+] [计划] [记录]
```

中间的 `[+]` 为快速添加按钮（弹出选择：添加资产 / 添加计划 / 添加消费）

---

## 5. UI 设计规范

### 5.1 设计原则
- **移动端优先**：以 375px 宽度为基准设计
- **简洁实用**：信息密度适中，操作路径短
- **色彩方案**：
  - 主色：#4A90D9（蓝色，稳重）
  - 辅色：#52C41A（绿色，收入/正数）
  - 警告：#FF4D4F（红色，支出/超支）
  - 背景：#F5F5F5
  - 卡片：#FFFFFF

### 5.2 首页布局
```
┌─────────────────────────┐
│     退休倒计时           │
│   距退休还有 XXXX 天     │
│   目标退休日: YYYY-MM-DD │
├─────────────────────────┤
│  预期寿命        详情 ›  │
│  82.3 岁 (+6.2年)       │
│  今日: 运动+0.5天 🟢    │
├─────────────────────────┤
│  养老金测算       详情 ›  │
│  月领 ¥3,XXX 共17.3年    │
│  总额 ¥XXX,XXX           │
├─────────────────────────┤
│  资产总览                │
│  总资产: ¥XXX,XXX.XX    │
│  ┌────┐ ┌────┐ ┌────┐  │
│  │银行│ │基金│ │股票│  │
│  └────┘ └────┘ └────┘  │
├─────────────────────────┤
│  本月消费概览            │
│  计划: ¥X,XXX  实际: ¥X,XXX│
│  ████████░░  75%        │
├─────────────────────────┤
│  最近消费记录            │
│  • 餐饮  -¥35.00  今天   │
│  • 交通  -¥12.00  昨天   │
└─────────────────────────┘
```

### 5.3 资产管理页布局
```
┌─────────────────────────┐
│  资产管理        [+添加] │
├─────────────────────────┤
│  总资产: ¥XXX,XXX.XX    │
├─────────────────────────┤
│  ▼ 银行存款  ¥XX,XXX   │
│    工商银行    ¥XX,XXX  │
│    招商银行    ¥XX,XXX  │
│  ▼ 支付宝    ¥XX,XXX   │
│    支付宝余额  ¥XX,XXX  │
│  ▼ 基金      ¥XX,XXX   │
│    沪深300    ¥XX,XXX  │
│  ▼ 股票      ¥XX,XXX   │
│  ▼ 养老金    ¥XX,XXX   │
└─────────────────────────┘
```

---

## 6. 项目目录结构

```
retire/
├── docs/
│   └── design.md              # 设计文档（本文件）
├── public/
│   └── favicon.ico
├── src/
│   ├── App.vue                # 根组件
│   ├── main.ts                # 入口文件
│   ├── router/
│   │   └── index.ts           # 路由配置
│   ├── stores/
│   │   ├── user.ts            # 用户配置 Store
│   │   ├── assets.ts          # 资产管理 Store
│   │   ├── plans.ts           # 消费计划 Store
│   │   ├── expenses.ts        # 消费记录 Store
│   │   ├── health.ts          # 健康画像与每日记录 Store
│   │   └── pension.ts         # 养老金 Store（含缴费阶段管理）
│   ├── db/
│   │   ├── index.ts           # IndexedDB 初始化（v3，idb 封装）
│   │   ├── base.ts            # 基础 CRUD 服务
│   │   └── indexes.ts         # 索引定义
│   ├── types/
│   │   └── index.ts           # TypeScript 类型定义（含健康、养老金类型）
│   ├── utils/
│   │   ├── format.ts          # 格式化工具（金额、日期）
│   │   ├── calc.ts            # 计算工具（倒计时、汇总）
│   │   ├── lifeExpectancy.ts  # 预期寿命计算引擎
│   │   └── pensionCalc.ts     # 养老金计算工具（含阶段展开）
│   ├── views/
│   │   ├── Home.vue           # 首页
│   │   ├── Assets.vue         # 资产管理
│   │   ├── AssetForm.vue      # 资产表单
│   │   ├── Plans.vue          # 消费计划
│   │   ├── PlanForm.vue       # 计划表单
│   │   ├── Expenses.vue       # 消费记录
│   │   ├── ExpenseForm.vue    # 消费表单
│   │   ├── HealthProfile.vue  # 健康画像
│   │   ├── HealthDaily.vue    # 每日健康记录列表
│   │   ├── HealthDailyForm.vue# 添加/编辑每日健康记录
│   │   ├── HealthResult.vue   # 预期寿命结果展示
│   │   ├── Pension.vue        # 养老金测算（含缴费阶段管理）
│   │   ├── PensionPhaseForm.vue# 添加/编辑缴费阶段
│   │   ├── PensionRecords.vue # 养老金缴存记录列表
│   │   ├── PensionRecordForm.vue# 添加/编辑缴存记录
│   │   ├── PensionHelp.vue    # 养老金计算说明
│   │   └── Settings.vue       # 设置
│   ├── components/
│   │   ├── TabBar.vue         # 底部导航（含 FAB 快速添加菜单）
│   │   ├── CountDown.vue      # 倒计时组件
│   │   ├── AssetCard.vue      # 资产卡片
│   │   ├── ExpenseItem.vue    # 消费条目
│   │   ├── ProgressRing.vue   # 进度环组件
│   │   ├── LifeExpectancyCard.vue # 首页预期寿命卡片
│   │   └── PensionCard.vue    # 首页养老金卡片
│   └── styles/
│       └── global.css         # 全局样式
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .gitignore
```

---

## 7. 关键业务逻辑

### 7.1 退休倒计时计算
```
退休日期 = 出生日期 + 目标退休年龄年数
剩余天数 = 退休日期 - 当前日期
剩余年月 = 向下取整(剩余天数 / 365.25)
```

### 7.2 资产汇总
```
总资产 = SUM(所有可见账户的余额)
按类型汇总 = GROUP BY accountType, SUM(balance)
```

### 7.3 消费对比分析
```
月度计划总额 = SUM(当月所有启用的消费计划的 monthlyAmount)
月度实际总额 = SUM(当月所有消费记录的 amount)
消费进度 = 月度实际总额 / 月度计划总额 * 100%
```

### 7.4 退休财务预测
```
预计退休时总资产 = 当前总资产 + (月度结余 × 剩余月数)
月度结余 = 月收入 - 月度计划总额（简化模型）
```

### 7.5 预期寿命计算
```
预估寿命 = 基准寿命 + Σ(因素调整值)
基准寿命 = WHO 生命表查询（按年龄、性别）
因素调整 = 吸烟 + 饮酒 + 饮食 + 运动 + BMI + 睡眠 + 压力 + 空气质量 + 慢性病 + 家族史
每日记录影响 = Σ(记录影响 × e^(-λ × 距今天数))
总调整限制 = 基准寿命 × ±25%
```

### 7.6 养老金计算
```
月养老金 = 基础养老金 + 个人账户养老金 + 过渡性养老金
基础养老金 = 退休时上年度社平工资 × (1 + 平均缴费指数) / 2 × 缴费年限 × 1%
个人账户养老金 = 个人账户储存额 / 计发月数
过渡性养老金 = 退休时社平工资 × 视同缴费指数 × 视同缴费年限 × 过渡系数

缴费阶段展开：
  在职阶段 → 逐年生成 PensionRecord
  灵活就业阶段（可选）→ 社平工资 × 60%（默认）× 20% 缴费比例
```

---

## 8. 开发计划

### 阶段一：基础框架
1. 初始化 Vue 3 + Vite 项目
2. 配置 TypeScript、路由、Pinia
3. 实现 PouchDB 数据层
4. 定义所有 TypeScript 类型

### 阶段二：核心功能
5. 实现设置页面（用户配置）
6. 实现资产管理 CRUD
7. 实现消费计划 CRUD
8. 实现消费记录 CRUD

### 阶段三：首页与整合
9. 实现退休倒计时组件
10. 实现首页仪表盘
11. 实现底部导航
12. 样式优化与响应式适配

### 阶段四：完善
13. 数据导出/导入功能
14. 数据统计图表
15. 性能优化

### 阶段五：预期寿命与养老金测算（新增）
16. 实现预期寿命评估模块（健康画像 + 每日记录 + 动态预测）
17. 实现养老金测算模块（结合预期寿命计算养老金可领年数与总额）
18. 首页集成预期寿命与养老金测算结果展示

---

## 9. 预期寿命评估模块设计（新增）

### 9.1 模块概述

本模块基于流行病学研究的加权评分模型，根据用户的生活习惯、饮食结构、运动情况、吸烟饮酒等健康相关因素，预测用户的预期寿命。用户可以填写初始健康画像，并支持每日追加记录生活习惯的变化（如今天抽了多少烟、吃了多少高热量食物、运动了多少等），系统会动态更新预期寿命预测。

核心算法采用 **基准调整法**：
```
预估寿命 = 基准寿命 + Σ(因素调整值)
```

- **基准寿命**：来自 WHO/各国统计局生命表，按性别和当前年龄查表获取
- **因素调整值**：基于大规模流行病学队列研究的相对风险度（hazard ratio）量化

### 9.2 数据模型

#### 9.2.1 健康画像（health_profile）

用户一次性填写的长期健康基线数据，作为预期寿命计算的初始输入。

```typescript
interface HealthProfile extends BaseDocument {
  type: 'health_profile';
  data: {
    // --- 吸烟 ---
    smokingStatus: 'never' | 'former' | 'current';  // 吸烟状态
    cigarettesPerDay?: number;                          // 每日吸烟支数（当前吸烟者）
    smokingYears?: number;                             // 烟龄（年）
    quitSmokingYears?: number;                          // 戒烟年数（已戒烟者）

    // --- 饮酒 ---
    drinkingStatus: 'never' | 'occasional' | 'regular' | 'heavy';  // 饮酒状态
    drinksPerWeek?: number;                            // 每周饮酒杯数

    // --- 饮食结构 ---
    dietPattern: 'healthy' | 'average' | 'unhealthy';  // 整体饮食模式
    fruitVegServingsPerDay: number;                     // 每日蔬果份数（0-10）
    redMeatFreqPerWeek: number;                         // 每周红肉次数（0-14）
    processedFoodFreqPerWeek: number;                   // 每周加工食品次数（0-14）
    sugarDrinkFreqPerWeek: number;                      // 每周含糖饮料次数（0-14）

    // --- 身体活动 ---
    exerciseFreqPerWeek: number;                        // 每周运动次数（0-7）
    exerciseMinutesPerSession: number;                  // 每次运动时长（分钟）
    sedentaryHoursPerDay: number;                       // 每日久坐时长（小时）

    // --- 身体指标 ---
    height: number;                                     // 身高（cm）
    weight: number;                                     // 体重（kg）
    // BMI = weight / (height/100)^2，自动计算

    // --- 睡眠 ---
    sleepHoursPerDay: number;                           // 每日睡眠时长（小时）

    // --- 心理与环境 ---
    stressLevel: number;                                // 压力水平（1-10）
    airQuality: 'good' | 'moderate' | 'poor';          // 居住地空气质量

    // --- 慢性病史 ---
    hasDiabetes: boolean;                                // 糖尿病
    hasHypertension: boolean;                           // 高血压
    hasHeartDisease: boolean;                            // 心脏病
    hasStroke: boolean;                                 // 中风
    hasCancer: boolean;                                 // 癌症

    // --- 家族史 ---
    familyHistoryLongevity: boolean;                     // 直系亲属有长寿（>85岁）
    familyHistoryHeartDisease: boolean;                 // 家族心脏病史
    familyHistoryCancer: boolean;                       // 家族癌症史
  };
}
```

**文档ID**: `health_profile_main`（单例，每个用户只有一份）

#### 9.2.2 每日健康记录（health_daily_record）

用户每日追加的生活习惯变化记录，用于动态微调预期寿命。

```typescript
// 每日记录条目类型
type DailyRecordCategory =
  | 'smoking'           // 吸烟
  | 'alcohol'           // 饮酒
  | 'diet'              // 饮食
  | 'exercise'          // 运动
  | 'sleep'            // 睡眠
  | 'high_calorie'      // 高热量食物
  | 'junk_food'        // 垃圾食品
  | 'other';            // 其他

interface HealthDailyRecord extends BaseDocument {
  type: 'health_daily_record';
  data: {
    date: string;                    // 记录日期 YYYY-MM-DD
    category: DailyRecordCategory;  // 记录类别
    description: string;             // 描述（如"抽了10根烟"、"吃了炸鸡"）
    impact: number;                  // 该条记录对寿命的影响（天），正数延长、负数缩短
    quantity?: number;               // 数量（可选，如支数、杯数、分钟数）
    calories?: number;               // 热量（可选，饮食类）
    metadata?: Record<string, any>;  // 扩展元数据
  };
}
```

**文档ID**: `health_daily_{uuid}`

**索引字段**: `data.date`, `data.category`

#### 9.2.3 预期寿命快照（life_expectancy_snapshot）

每次计算后保存的预期寿命快照，用于追踪变化趋势。

```typescript
interface LifeExpectancySnapshot extends BaseDocument {
  type: 'life_expectancy_snapshot';
  data: {
    date: string;                  // 快照日期 YYYY-MM-DD
    baselineAge: number;            // 基准预期寿命（岁）
    adjustedAge: number;           // 调整后预期寿命（岁）
    totalAdjustmentDays: number;    // 总调整天数（正/负）
    profileAdjustmentDays: number;  // 健康画像贡献的调整天数
    dailyAdjustmentDays: number;     // 每日记录累计贡献的调整天数
    breakdown: {                    // 各因素调整明细
      factorName: string;
      adjustmentDays: number;       // 该因素贡献的调整天数
    }[];
  };
}
```

**文档ID**: `le_snapshot_{date}`

**索引字段**: `data.date`

### 9.3 预期寿命计算模型

#### 9.3.1 基准寿命获取

使用内置的中国/全球生命表数据（按性别和年龄查表），数据来源参考 WHO Global Health Observatory 和中国国家统计局。

```typescript
// 生命表数据结构
interface LifeTableEntry {
  age: number;       // 年龄
  male: number;       // 男性剩余预期寿命
  female: number;     // 女性剩余预期寿命
}

// 示例：根据当前年龄和性别获取基准剩余寿命
function getBaselineLifeExpectancy(age: number, gender: 'male' | 'female'): number;
```

#### 9.3.2 因素权重定义

每个因素基于流行病学研究确定最大调整范围和评分函数：

| 因素 | 最大调整 | 评分逻辑 |
|------|---------|---------|
| 吸烟 | -10年 | 从不吸烟: 0; 已戒烟: -0.3~0; 轻度: -0.6; 重度: -1.0 |
| 饮酒 | -3.5年 | 不/偶尔: 0; 适量: 0; 过量: 线性递减 |
| 饮食结构 | +2年 / -1.5年 | 健康饮食加分，高糖/高加工食品扣分 |
| 运动 | +4.5年 | 每周≥150分钟中等强度: +1.0; 久坐>8h/天: 扣分 |
| BMI | -4年 | 18.5-24.9: 0; 偏瘦/肥胖: 非线性扣分 |
| 睡眠 | +1年 / -1年 | 7-8小时: 最佳; 过少/过多: 扣分 |
| 压力 | -1年 | 长期高压(>7): 扣分 |
| 空气质量 | -1年 | 重度污染: 扣分 |
| 慢性病 | -3~5年 | 每种慢性病独立扣分 |
| 家族史 | +1年 / -2年 | 长寿家族加分，疾病家族史扣分 |

#### 9.3.3 计算公式

```typescript
function calculateLifeExpectancy(
  profile: HealthProfile,
  dailyRecords: HealthDailyRecord[],
  currentAge: number,
  gender: 'male' | 'female'
): LifeExpectancyResult {
  // 1. 获取基准寿命
  const baseline = getBaselineLifeExpectancy(currentAge, gender);

  // 2. 计算健康画像调整（长期因素）
  const profileAdjustment = calculateProfileAdjustment(profile);

  // 3. 计算每日记录累计调整（短期行为变化）
  const dailyAdjustment = calculateDailyAdjustment(dailyRecords);

  // 4. 合并结果，限制总调整不超过基准的 ±25%
  const totalAdjustment = clampAdjustment(
    profileAdjustment + dailyAdjustment,
    baseline * 0.25
  );

  return {
    baselineYears: baseline,
    adjustedYears: baseline + totalAdjustment,
    totalAdjustmentDays: totalAdjustment * 365,
    profileAdjustmentDays: profileAdjustment * 365,
    dailyAdjustmentDays: dailyAdjustment * 365,
    breakdown: getBreakdown(profile),
  };
}
```

#### 9.3.4 每日记录的动态影响

每日健康记录对预期寿命的影响采用 **衰减累积模型**：

```
当日影响 = 记录的即时影响值
累计影响 = Σ(历史记录影响 × 衰减系数)
衰减系数 = e^(-λ × 距今天数)，λ 为衰减速率
```

- 单次记录的影响随时间衰减，鼓励用户持续保持好习惯
- 例如：今天运动30分钟 → +0.5天；连续运动30天 → 累计效果显著
- 每日记录的影响值预定义：

| 记录类别 | 具体行为 | 影响值（天） |
|---------|---------|------------|
| 吸烟 | 每抽1根烟 | -0.02 |
| 饮酒 | 每多饮1杯 | -0.05 |
| 运动 | 每30分钟中等强度 | +0.5 |
| 高热量食物 | 每次高热量摄入 | -0.1 |
| 垃圾食品 | 每次垃圾食品 | -0.08 |
| 睡眠 | 睡眠不足(<6h) | -0.3 |
| 睡眠 | 充足睡眠(7-8h) | +0.1 |

### 9.4 页面与路由设计

#### 新增路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/health` | 健康画像 | 填写/编辑健康基线数据 |
| `/health/daily` | 每日健康记录 | 每日追加生活习惯变化记录列表 |
| `/health/daily/add` | 添加每日记录 | 快速记录今日健康行为 |
| `/health/result` | 预期寿命结果 | 展示预期寿命预测结果与趋势 |

#### 底部导航栏调整

```
[首页] [资产] [+] [计划] [记录]
```

导航栏保持不变，在 FAB 快速添加菜单中新增"记录健康"选项，首页新增预期寿命卡片入口。

### 9.5 UI 设计

#### 9.5.1 健康画像页布局

```
┌─────────────────────────┐
│  ‹ 返回    健康画像      │
├─────────────────────────┤
│  🚬 吸烟情况             │
│  [从不] [已戒] [当前]    │
│  每日 ___ 支  烟龄 ___ 年│
├─────────────────────────┤
│  🍺 饮酒情况             │
│  [从不] [偶尔] [经常] [大量]│
│  每周 ___ 杯             │
├─────────────────────────┤
│  🥗 饮食结构             │
│  整体: [健康] [一般] [不健康]│
│  蔬果: ___份/天          │
│  红肉: ___次/周          │
│  加工食品: ___次/周       │
│  含糖饮料: ___次/周       │
├─────────────────────────┤
│  🏃 身体活动             │
│  运动: ___次/周 每次___分钟│
│  久坐: ___小时/天        │
├─────────────────────────┤
│  ⚖️ 身体指标             │
│  身高: ___cm  体重: ___kg│
│  BMI: 22.5 (正常)        │
├─────────────────────────┤
│  😴 睡眠                 │
│  每日 ___ 小时           │
├─────────────────────────┤
│  🧠 心理与环境           │
│  压力: 1[====|====]10    │
│  空气: [好] [中] [差]    │
├─────────────────────────┤
│  🏥 慢性病史             │
│  □ 糖尿病 □ 高血压       │
│  □ 心脏病 □ 中风 □ 癌症  │
├─────────────────────────┤
│  👨‍👩‍👧 家族史              │
│  □ 长寿家族 □ 心脏病      │
│  □ 癌症家族史            │
├─────────────────────────┤
│  [保存健康画像]           │
└─────────────────────────┘
```

#### 9.5.2 每日健康记录页布局

```
┌─────────────────────────┐
│  ‹ 返回    每日健康记录 [+添加] │
├─────────────────────────┤
│  📊 本周影响概览         │
│  运动 +2.5天  吸烟 -0.6天 │
│  饮食 -0.3天  睡眠 +0.7天 │
│  本周净影响: +2.3天 🟢   │
├─────────────────────────┤
│  📅 2026-06-16 今天      │
│  🏃 跑步30分钟     +0.5天 │
│  🚬 抽了5根烟      -0.1天 │
│  🍔 吃了汉堡        -0.1天 │
├─────────────────────────┤
│  📅 2026-06-15 昨天      │
│  🏃 游泳45分钟     +0.8天 │
│  😴 睡了5小时       -0.3天 │
├─────────────────────────┤
│  📅 2026-06-14           │
│  🚬 抽了10根烟     -0.2天 │
│  🍺 喝了3杯酒      -0.15天│
└─────────────────────────┘
```

#### 9.5.3 预期寿命结果页布局

```
┌─────────────────────────┐
│  ‹ 返回    预期寿命评估   │
├─────────────────────────┤
│     🎂                   │
│  预期寿命                │
│  82.3 岁                │
│  基准 76.1 + 调整 +6.2年 │
├─────────────────────────┤
│  📊 因素影响分析         │
│  ┌─────────────────────┐│
│  │ 🏃 运动    +4.2年  ││
│  │ 🥗 饮食    +1.8年  ││
│  │ 😴 睡眠    +0.8年  ││
│  │ 👨‍👩‍👧 家族    +0.5年  ││
│  │ 🚬 吸烟    -3.2年  ││
│  │ ⚖️ BMI     -1.0年  ││
│  │ 🍺 饮酒    -0.5年  ││
│  │ 📅 每日记录 +0.6年  ││
│  └─────────────────────┘│
├─────────────────────────┤
│  📈 寿命变化趋势         │
│  [折线图：近30天/90天预期寿命变化]│
├─────────────────────────┤
│  💡 改善建议             │
│  • 戒烟可延长寿命约3年   │
│  • 每周多运动60分钟...   │
│  • 减少加工食品摄入...   │
└─────────────────────────┘
```

#### 9.5.4 首页新增卡片

在首页仪表盘中新增预期寿命卡片：

```
┌─────────────────────────┐
│  预期寿命        详情 ›  │
│  82.3 岁 (+6.2年)       │
│  今日: 运动+0.5天 🟢    │
└─────────────────────────┘
```

---

## 10. 养老金测算模块设计（新增）

### 10.1 模块概述

结合用户的预期寿命预测结果和养老金缴存情况，计算退休后可领取的养老金总额、每月可领取金额、可领取年数等关键指标。支持**缴费阶段**输入方式，用户只需输入几个阶段的缴费信息，系统自动展开为逐年记录。支持**灵活就业自动推算**，停止工作后按社平工资 60% 档位继续缴费至退休。

### 10.2 数据模型

#### 10.2.1 养老金缴存记录（pension_record）

```typescript
interface PensionRecord extends BaseDocument {
  type: 'pension_record';
  data: {
    year: number;                     // 缴费年份
    monthlyBase: number;             // 月缴费基数（元）
    avgWage: number;                  // 当年社平工资（元/月）
    personalRate: number;             // 个人缴费比例（%，默认8%）
    monthlyPersonal: number;          // 月个人缴费额（元）
    employerRate: number;             // 单位缴费比例（%，默认16%）
    monthlyEmployer: number;          // 月单位缴费额（元）
    monthsPaid: number;               // 当年实际缴费月数
    totalPaid: number;                // 当年总缴费额（元）
    pensionType: 'basic' | 'supplementary';
    description?: string;             // 备注
  };
}
```

#### 10.2.2 缴费阶段（pension_phase）

用户以"阶段"为单位输入缴费信息，系统自动展开为逐年记录。

```typescript
interface PensionPhase {
  id?: string;
  startYear: number;                  // 阶段起始年份（含）
  endYear: number;                    // 阶段结束年份（含）
  monthlyBase: number;                // 月缴费基数（元）
  avgWage: number;                   // 该阶段社平工资（元/月）
  personalRate: number;               // 个人缴费比例（%）
  employerRate: number;               // 单位缴费比例（%）
  monthsPaidPerYear: number;          // 每年缴费月数（默认12）
  description?: string;               // 备注
  // 灵活就业
  autoFlexEmployment: boolean;        // 停止工作后是否自动按灵活就业缴费
  flexBasePercent: number;            // 灵活就业缴费基数 = 社平工资 × 此比例（默认60%）
}
```

**存储方式**：所有阶段存储在一个 `pension_phases` 文档中（嵌套数组）。

#### 10.2.3 养老金测算配置（pension_config）

```typescript
interface PensionConfig extends BaseDocument {
  type: 'pension_config';
  data: {
    pensionType: 'basic' | 'supplementary' | 'both';
    currentPensionBalance: number;     // 当前养老金个人账户余额（元）
    retirementAge: number;             // 法定退休年龄
    // 过渡性养老金参数（针对1996年前参加工作的"中人"）
    hasTransitionalPension: boolean;   // 是否有视同缴费年限
    deemedYears: number;               // 视同缴费年限（年）
    deemedIndex: number;               // 视同缴费指数
    transitionalRate: number;          // 过渡系数（通常1.0%-1.4%）
  };
}
```

### 10.3 养老金计算模型

#### 10.3.1 精确计算公式

依据《国务院关于完善企业职工基本养老保险制度的决定》（国发〔2005〕38号）：

```
月养老金 = 基础养老金 + 个人账户养老金 + 过渡性养老金

基础养老金 = 退休时上年度社平工资 × (1 + 平均缴费指数) / 2 × 缴费年限 × 1%

个人账户养老金 = 个人账户储存额 / 计发月数

过渡性养老金 = 退休时社平工资 × 视同缴费指数 × 视同缴费年限 × 过渡系数
```

#### 10.3.2 逐年精确计算

- 每年分别记录缴费基数和社平工资，计算当年缴费指数 = 缴费基数 / 社平工资
- 个人账户按历年人社部公布的记账利率逐年计息
- 退休时社平工资按最近几年实际增长率推算

#### 10.3.3 缴费阶段展开

系统将用户输入的缴费阶段自动展开为逐年 `PensionRecord`：

1. **在职阶段**：按阶段参数逐年生成记录
2. **灵活就业阶段**（可选）：从阶段结束年份到退休年份，按社平工资 × flexBasePercent（默认60%）生成记录，缴费比例固定为 20%（8% 入个人账户，12% 入统筹）

#### 10.3.4 灵活就业档位选择

| 档位 | 缴费指数 | 每元回报倍数 | 回本年限 |
|------|---------|------------|---------|
| 60%（默认） | 0.6 | 1.33 倍 | 最快 |
| 100% | 1.0 | 1.00 倍 | 中等 |
| 300% | 3.0 | 0.67 倍 | 最慢 |

默认选择 60% 档位，性价比最高。

### 10.4 页面与路由设计

| 路径 | 页面 | 说明 |
|------|------|------|
| `/pension` | 养老金测算 | 测算参数、缴费阶段管理、测算结果、计算明细、历年明细、充足性分析 |
| `/pension/phases/add` | 添加缴费阶段 | 新增缴费阶段表单 |
| `/pension/phases/edit/:id` | 编辑缴费阶段 | 编辑已有缴费阶段 |
| `/pension/records` | 缴存记录 | 展开后的逐年缴存记录（只读） |
| `/pension/records/add` | 添加缴存记录 | 手动添加单年缴存记录 |
| `/pension/help` | 计算说明 | 公式说明、缴费比例对比、灵活就业档位分析 |

### 10.5 浙里办参保证明 PDF 导入

支持从浙里办 APP 下载的"基本养老历年参保证明"PDF 直接导入缴费记录。

#### 10.5.1 PDF 格式特征

- **标题**：浙江省职工基本养老保险历年参保证明
- **头部信息**：姓名、社会保障号、参保状态、性别、累计缴费年限
- **表格列**：参保地、年度、缴费起止时间（YYYYMM-YYYYMM）、月缴费基数（元）、参保单位名称、备注
- **特点**：同一自然年内可能有多个记录（换单位），需要按年度合并

#### 10.5.2 解析流程

```
用户选择 PDF 文件
       │
       ▼
  ┌─────────┐
  │ pdfjs-dist│  动态加载（按需，减少初始包体积）
  │ 提取文本  │
  └────┬────┘
       │
       ▼
  ┌─────────┐
  │ 正则匹配  │  匹配：参保地 年度 起止时间 基数 单位名
  │ 原始记录  │
  └────┬────┘
       │
       ▼
  ┌─────────┐
  │ 按年合并  │  同一年度多条记录按月数加权平均基数
  │ 生成记录  │
  └────┬────┘
       │
       ▼
  ┌─────────┐
  │ 预览确认  │  展示解析结果，用户确认后写入数据库
  └─────────┘
```

#### 10.5.3 合并规则

同一自然年内多条记录（换单位导致）合并为一条年度记录：
- **缴费月数**：各段月数之和（上限 12 个月）
- **月缴费基数**：按月数加权平均
- **社平工资**：暂按缴费基数估算（100%），用户可后续修正
- **缴费比例**：默认个人 8%、单位 16%

#### 10.5.4 技术实现

- **PDF 解析库**：`pdfjs-dist`（Mozilla PDF.js）
- **加载方式**：动态 `import()` 按需加载，避免增加初始包体积
- **Worker 配置**：Vite `?url` 导入 worker 文件
- **文件位置**：`src/utils/pdfImport.ts`

### 10.6 Gitee 配置存储

Gitee 同步配置存储在 IndexedDB 中（`gitee_sync_config` 文档类型），随主数据一起备份恢复。

### 10.7 UI 设计

#### 10.7.1 养老金测算页布局

```
┌─────────────────────────┐
│  ‹ 返回    养老金测算    │
├─────────────────────────┤
│  📋 测算参数             │
│  当前个人账户余额: ¥XX,XXX│
│  投资年化收益率: 3%      │
│  社平工资增长率: 5%      │
│  [修改参数]              │
├─────────────────────────┤
│  💰 测算结果             │
│                         │
│  预期寿命: 82.3 岁       │
│  退休年龄: 65 岁         │
│  可领取年数: 17.3 年     │
│  ─────────────────────  │
│  月养老金: ¥3,XXX        │
│  年养老金: ¥XX,XXX       │
│  养老金总额: ¥XXX,XXX    │
├─────────────────────────┤
│  📊 资产充足性分析        │
│  退休时总资产: ¥XXX,XXX  │
│  + 养老金总额: ¥XXX,XXX  │
│  = 总可用: ¥XXX,XXX      │
│  月均可用: ¥X,XXX        │
│  月均支出: ¥X,XXX        │
│  ─────────────────────  │
│  ✅ 资产充足 / ❌ 资金缺口│
│  缺口: ¥XXX,XXX          │
├─────────────────────────┤
│  📈 养老金趋势图         │
│  [折线图：资产变化趋势]   │
├─────────────────────────┤
│  [查看缴存记录]          │
└─────────────────────────┘
```

#### 10.7.2 首页新增养老金卡片

在首页仪表盘中新增养老金测算卡片：

```
┌─────────────────────────┐
│  养老金测算       详情 ›  │
│  月领 ¥3,XXX 共17.3年    │
│  总额 ¥XXX,XXX           │
└─────────────────────────┘
```

---

## 11. 新增文件清单

### 11.1 数据层

| 文件 | 说明 |
|------|------|
| `src/stores/health.ts` | 健康画像与每日记录 Store |
| `src/stores/pension.ts` | 养老金 Store |
| `src/utils/lifeExpectancy.ts` | 预期寿命计算引擎（基准寿命表 + 因素权重 + 评分函数） |
| `src/utils/pensionCalc.ts` | 养老金计算工具 |
| `src/utils/pdfImport.ts` | 浙里办参保证明 PDF 解析工具（pdfjs-dist 动态加载） |

### 11.2 视图层

| 文件 | 说明 |
|------|------|
| `src/views/HealthProfile.vue` | 健康画像页面（填写/编辑基线数据） |
| `src/views/HealthDaily.vue` | 每日健康记录列表页 |
| `src/views/HealthDailyForm.vue` | 添加/编辑每日健康记录表单 |
| `src/views/HealthResult.vue` | 预期寿命结果展示页 |
| `src/views/Pension.vue` | 养老金测算页（含缴费阶段管理） |
| `src/views/PensionPhaseForm.vue` | 添加/编辑缴费阶段表单 |
| `src/views/PensionRecords.vue` | 养老金缴存记录列表页 |
| `src/views/PensionRecordForm.vue` | 添加/编辑缴存记录表单 |
| `src/views/PensionHelp.vue` | 养老金计算说明页 |

### 11.3 组件层

| 文件 | 说明 |
|------|------|
| `src/components/LifeExpectancyCard.vue` | 首页预期寿命卡片组件 |
| `src/components/PensionCard.vue` | 首页养老金卡片组件 |

### 11.4 类型定义更新

在 `src/types/index.ts` 中新增：
- `HealthProfile` 接口
- `HealthDailyRecord` 接口
- `DailyRecordCategory` 类型
- `LifeExpectancySnapshot` 接口
- `PensionRecord` 接口（含 avgWage 字段）
- `PensionConfig` 接口（含过渡性养老金参数）
- `PensionPhase` 接口（缴费阶段，非 BaseDocument）
- `GiteeSyncConfig` 接口

### 11.5 数据库升级

IndexedDB 版本从 1 升级到 3：
- v2: 新增索引
- v3: 修复 upgrade 回调中的事务错误

### 11.6 路由更新

在 `src/router/index.ts` 中新增路由：
- `/health`, `/health/daily`, `/health/daily/add`, `/health/result`
- `/pension`, `/pension/phases/add`, `/pension/phases/edit/:id`
- `/pension/records`, `/pension/records/add`, `/pension/records/edit/:id`
- `/pension/help`

### 11.7 导航更新

- `TabBar.vue` FAB 菜单新增"记录健康"选项
- `TabBar.vue` FAB 菜单新增"记录缴存"选项

---

## 12. 数据流设计

```
用户填写健康画像
       │
       ▼
  ┌─────────┐     ┌──────────────┐
  │HealthProfile│───→│ 预期寿命引擎  │
  └─────────┘     │ lifeExpectancy│
       │          │   .ts         │
       │          └──────┬───────┘
       │                 │
用户每日记录 ─────────→  │
(HealthDailyRecord)     │
       │                 ▼
       │          ┌──────────┐
       │          │ 调整后寿命 │
       │          └────┬─────┘
       │               │
       ▼               ▼
  ┌──────────┐   ┌──────────┐
  │ 快照存储  │   │ 首页展示  │
  │ Snapshot │   │ 趋势图   │
  └──────────┘   └────┬─────┘
                       │
                       ▼
                ┌──────────────┐
                │ 养老金测算引擎 │
                │ pensionCalc  │
                │    .ts       │
                └──────┬───────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     月养老金      可领取年数     资产充足性
```
