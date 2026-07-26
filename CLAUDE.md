# CLAUDE.md — 退休规划应用 AI 规则

## 项目概述

退休规划 PWA 应用，帮助用户进行退休资产测算、养老金计算、健康预期寿命评估。

- **框架**: Vue 3 + TypeScript + Vite + Pinia
- **PWA**: vite-plugin-pwa，支持离线使用和自动更新
- **存储**: IndexedDB（业务数据）+ zen-fs-config（配置管理）

## 构建命令

```bash
npm run dev      # 开发服务器
npm run build    # 类型检查 + 构建（vue-tsc -b && vite build）
npm run preview  # 预览构建结果
```

## 架构

### 数据存储分层

1. **配置层**（zen-fs-config）：用户配置、养老金参数、健康画像、同步设置
   - IndexedDB 为主后端（offline-first）
   - Gitee 等远程后端作为副本，自动双向同步
   - 入口: `src/config/configRepo.ts` → `src/stores/config.ts`
   - 配置路径: `/user`, `/pension`, `/health`, `/sync`

2. **业务数据层**（原有 IndexedDB）：资产账户、消费记录、养老金缴存记录、健康每日记录、预期寿命快照
   - 入口: `src/db/index.ts`（基于 idb 封装）
   - 各业务 store 直接读写，不走 zen-fs-config

### Store 结构

| Store | 文件 | 职责 |
|---|---|---|
| config | `stores/config.ts` | zen-fs-config 配置管理（4 种配置 + 后端拓扑 + 同步） |
| user | `stores/user.ts` | 用户配置（委托 config store） |
| pension | `stores/pension.ts` | 养老金配置（委托 config store）+ 缴存记录/阶段（db） |
| health | `stores/health.ts` | 健康画像（委托 config store）+ 每日记录/快照（db） |
| assets | `stores/assets.ts` | 资产账户（db） |
| expenses | `stores/expenses.ts` | 消费计划/记录（db） |
| plans | `stores/plans.ts` | 支出计划（db） |
| avgWage | `stores/avgWage.ts` | 社平工资数据（db） |

### 启动流程

```
main.ts
  → createIndexes()           // 初始化 db 索引
  → initConfigRepo()          // 初始化 zen-fs-config（注册 Gitee 后端 + 创建 ConfigRepo）
  → configStore.loadAll()     // 加载配置 + 旧数据迁移 + 自动连接 Gitee
  → app.mount('#app')         // 挂载应用
```

## 关键约定

### 配置读写

- 配置通过 `useConfigStore()` 的 getter/setter 读写，不直接操作 db 或 zen-fs-config
- 现有 store（user/pension/health）的 `loadConfig`/`saveConfig` 委托给 config store
- config store 的 `loadAll()` 包含一次性迁移：如果 zen-fs-config 无配置，从旧 db 读取

### 同步管理

- Gitee 后端类型通过 `registerBackend('Gitee', factory)` 注册
- 添加后端: `configStore.addGiteeBackend(id, options, description)`
- 移除后端: `configStore.removeBackend(id)`
- 手动同步: `configStore.flush()`
- 状态查询: `configStore.getSyncStatuses()` → `Map<string, SyncPairStatus>`

### 类型安全

- 所有文档类型定义在 `src/types/index.ts`
- 严格 TypeScript：`vue-tsc -b` 在构建时进行类型检查
- `.vue` 文件类型声明: `declare module '*.vue'`

### PWA 更新

- Service Worker 缓存可能导致旧 chunk 加载失败
- 路由懒加载有错误处理：import 失败时清空 SW 缓存并重载
- 更新提示组件: `src/components/UpdateToast.vue`

### 数据格式

- 养老金金额单位：元（非万元）
- 社平工资：月平均工资（元/月）
- 日期格式：ISO 8601（`YYYY-MM-DD`）
- 金额显示：`¥` + 千分位分隔

## 文件结构

```
src/
├── config/
│   └── configRepo.ts        # zen-fs-config 初始化 + Gitee 后端注册
├── db/
│   ├── base.ts              # idb 封装基础
│   ├── index.ts             # db 导出
│   └── indexes.ts           # 索引创建
├── stores/
│   ├── config.ts            # 配置管理 store（zen-fs-config）
│   ├── user.ts              # 用户配置 store
│   ├── pension.ts           # 养老金 store
│   ├── health.ts            # 健康 store
│   ├── assets.ts            # 资产 store
│   ├── expenses.ts          # 消费 store
│   ├── plans.ts             # 支出计划 store
│   └── avgWage.ts           # 社平工资 store
├── utils/
│   ├── pensionCalc.ts       # 养老金计算
│   ├── pensionCompare.ts    # 方案比较
│   ├── lifeExpectancy.ts    # 预期寿命计算
│   ├── giteeSync.ts         # 旧版 Gitee 同步（仅用于全量数据备份）
│   └── ...
├── views/                   # 页面组件
├── components/              # 通用组件
├── types/index.ts           # 类型定义
├── router/index.ts          # 路由
├── main.ts                  # 入口
├── App.vue                  # 根组件
├── sw.ts                    # Service Worker
└── version.ts               # 版本信息
```
