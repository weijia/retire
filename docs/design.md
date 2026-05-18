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
| `/` | 首页（倒计时仪表盘） | 退休倒计时、资产总览、消费概览 |
| `/assets` | 资产管理列表 | 按类型分组展示所有资产账户 |
| `/assets/add` | 添加/编辑资产 | 资产账户表单 |
| `/plans` | 消费计划列表 | 按年份和类别展示消费计划 |
| `/plans/add` | 添加/编辑计划 | 消费计划表单 |
| `/expenses` | 消费记录列表 | 按日期展示消费记录 |
| `/expenses/add` | 添加消费记录 | 消费记录表单 |
| `/settings` | 设置 | 用户信息、退休年龄配置 |

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
│   │   └── expenses.ts        # 消费记录 Store
│   ├── db/
│   │   ├── index.ts           # PouchDB 初始化
│   │   ├── base.ts            # 基础 CRUD 服务
│   │   └── indexes.ts         # 索引定义
│   ├── types/
│   │   └── index.ts           # TypeScript 类型定义
│   ├── utils/
│   │   ├── format.ts          # 格式化工具（金额、日期）
│   │   └── calc.ts            # 计算工具（倒计时、汇总）
│   ├── views/
│   │   ├── Home.vue           # 首页
│   │   ├── Assets.vue         # 资产管理
│   │   ├── AssetForm.vue      # 资产表单
│   │   ├── Plans.vue          # 消费计划
│   │   ├── PlanForm.vue       # 计划表单
│   │   ├── Expenses.vue       # 消费记录
│   │   ├── ExpenseForm.vue    # 消费表单
│   │   └── Settings.vue       # 设置
│   ├── components/
│   │   ├── TabBar.vue         # 底部导航
│   │   ├── CountDown.vue      # 倒计时组件
│   │   ├── AssetCard.vue      # 资产卡片
│   │   ├── ExpenseItem.vue    # 消费条目
│   │   └── ProgressRing.vue   # 进度环组件
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
