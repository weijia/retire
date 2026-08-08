/**
 * 数据同步管理模块
 *
 * 使用 zen-fs-config 0.5.0 的 data-sync 功能同步业务数据。
 * 支持分类存储：消费记录、资产账户、养老金记录、健康记录、消费计划等。
 */
import { getConfigRepo } from './configRepo';
import type { AppDataGroup } from 'zen-fs-config';

import { createLogger } from '@richard432/localstorage-logger';
const log = createLogger('retire:data-sync');

// 数据同步组单例
let dataGroupInstance: AppDataGroup | null = null;
const DATA_GROUP_ID = 'retire-data';

// 数据文件路径常量
const DATA_PATHS = {
  expenses: '/data/expense-records.json',
  assets: '/data/assets.json',
  pensionRecords: '/data/pension-records.json',
  healthRecords: '/data/health-records.json',
  plans: '/data/plans.json',
} as const;

/**
 * 初始化数据同步组
 * - 检查是否已存在数据同步组，有则恢复
 * - 无则创建新的（初始时可能没有后端）
 */
export async function initDataSync(): Promise<AppDataGroup> {
  const repo = getConfigRepo();

  // 1. 尝试恢复已有数据同步组
  const existingGroups = await repo.listAppDataGroups();
  const existing = existingGroups.find(g => g.id === DATA_GROUP_ID);

  if (existing) {
    dataGroupInstance = await repo.getAppDataGroup(DATA_GROUP_ID);
    log.log('恢复数据同步组，后端数:', dataGroupInstance.listBackends().length);
    return dataGroupInstance;
  }

  // 2. 创建新的数据同步组（初始无后端）
  dataGroupInstance = await repo.createAppDataGroup(DATA_GROUP_ID, []);
  log.log('创建新数据同步组');

  return dataGroupInstance;
}

/**
 * 获取数据同步组实例
 */
export function getDataGroup(): AppDataGroup {
  if (!dataGroupInstance) {
    throw new Error('[Retire] 数据同步未初始化，请先调用 initDataSync()');
  }
  return dataGroupInstance;
}

/**
 * 获取可复用账号的后端列表
 * 用于 UI 展示，让用户选择基于哪个 config-sync 后端创建数据后端
 */
export async function listAccountBackends() {
  const repo = getConfigRepo();
  return await repo.listAccountBackends();
}

/**
 * 添加数据同步后端（复用已有账号）
 * @param backendId 后端唯一标识
 * @param backendType 后端类型（Gitee/WebDAV/RemoteStorage）
 * @param options 存储位置选项（repo/branch 等）
 * @param accountBackendId 要复用的 config-sync 后端 ID
 * @param description 后端描述
 */
export async function addDataBackend(
  backendId: string,
  backendType: string,
  options: Record<string, unknown>,
  accountBackendId: string,
  _description?: string
): Promise<void> {
  const group = getDataGroup();
  const repo = getConfigRepo();

  // 获取账号后端信息
  const accountBackends = await repo.listAccountBackends();
  const accountBackend = accountBackends.find(b => b.id === accountBackendId);

  if (!accountBackend) {
    throw new Error(`账号后端 ${accountBackendId} 不存在`);
  }

  // 合并账号字段和存储位置字段
  const mergedOptions = {
    ...accountBackend.options, // token, owner 等
    ...options,                 // repo, branch 等
  };

  await group.addBackend(backendId, backendType, mergedOptions);
  log.log(`添加数据后端: ${backendId} (${backendType})`);
}

/**
 * 移除数据同步后端
 */
export async function removeDataBackend(backendId: string): Promise<void> {
  const group = getDataGroup();
  await group.removeBackend(backendId);
  log.log(`移除数据后端: ${backendId}`);
}

/**
 * 列出当前所有数据后端
 */
export function listDataBackends() {
  const group = getDataGroup();
  return group.listBackends();
}

/**
 * 获取同步状态
 */
export function getDataSyncStatuses() {
  const group = getDataGroup();
  return group.getSyncStatuses();
}

/**
 * 手动触发同步
 */
export async function flushDataSync(): Promise<void> {
  const group = getDataGroup();
  await group.flush();
  log.log('数据同步完成');
}

// ============ 数据读写操作 ============

/**
 * 确保数据目录存在
 */
async function ensureDataDir(): Promise<void> {
  const group = getDataGroup();
  try {
    await group.fs.promises.mkdir('/data', { recursive: true });
  } catch {
    // 目录可能已存在，忽略错误
  }
}

/**
 * 读取数据文件
 */
async function readDataFile<T>(path: string): Promise<T | null> {
  const group = getDataGroup();
  try {
    const raw = await group.fs.promises.readFile(path, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * 写入数据文件
 */
async function writeDataFile<T>(path: string, data: T): Promise<void> {
  const group = getDataGroup();
  await ensureDataDir();
  await group.fs.promises.writeFile(path, JSON.stringify(data, null, 2));
}

// ============ 消费记录 ============

/**
 * 读取消费记录
 */
export async function loadExpenseRecords<T>(): Promise<T[]> {
  const data = await readDataFile<{ records: T[] }>(DATA_PATHS.expenses);
  return data?.records || [];
}

/**
 * 保存消费记录
 */
export async function saveExpenseRecords<T>(records: T[]): Promise<void> {
  await writeDataFile(DATA_PATHS.expenses, { records });
}

// ============ 资产账户 ============

/**
 * 读取资产账户
 */
export async function loadAssets<T>(): Promise<T[]> {
  const data = await readDataFile<{ assets: T[] }>(DATA_PATHS.assets);
  return data?.assets || [];
}

/**
 * 保存资产账户
 */
export async function saveAssets<T>(assets: T[]): Promise<void> {
  await writeDataFile(DATA_PATHS.assets, { assets });
}

// ============ 养老金记录 ============

/**
 * 读取养老金记录
 */
export async function loadPensionRecords<T>(): Promise<T[]> {
  const data = await readDataFile<{ records: T[] }>(DATA_PATHS.pensionRecords);
  return data?.records || [];
}

/**
 * 保存养老金记录
 */
export async function savePensionRecords<T>(records: T[]): Promise<void> {
  await writeDataFile(DATA_PATHS.pensionRecords, { records });
}

// ============ 健康记录 ============

/**
 * 读取健康记录
 */
export async function loadHealthRecords<T>(): Promise<T[]> {
  const data = await readDataFile<{ records: T[] }>(DATA_PATHS.healthRecords);
  return data?.records || [];
}

/**
 * 保存健康记录
 */
export async function saveHealthRecords<T>(records: T[]): Promise<void> {
  await writeDataFile(DATA_PATHS.healthRecords, { records });
}

// ============ 消费计划 ============

/**
 * 读取消费计划
 */
export async function loadPlans<T>(): Promise<T[]> {
  const data = await readDataFile<{ plans: T[] }>(DATA_PATHS.plans);
  return data?.plans || [];
}

/**
 * 保存消费计划
 */
export async function savePlans<T>(plans: T[]): Promise<void> {
  await writeDataFile(DATA_PATHS.plans, { plans });
}

/**
 * 释放资源
 */
export async function disposeDataSync(): Promise<void> {
  if (dataGroupInstance) {
    await dataGroupInstance.dispose();
    dataGroupInstance = null;
    log.log('数据同步已释放');
  }
}

// 导出路径常量供外部使用
export { DATA_PATHS };
