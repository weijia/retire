/**
 * 配置数据同步组（settings group）
 *
 * 用户的三项业务配置（user / pension / health）不再写 Config Repo 的
 * repo.setConfig()，而是集中存到一个独立的数据同步组的一份 JSON 文件里：
 *
 *   AppDataGroup 'retire-settings'
 *     └─ /config.json  { user, pension, health, sync, dataSync }
 *
 * 这样配置与业务数据一样，由 <sync-group-configurator> 的 data-sync 组
 * 统一同步（Gitee / WebDAV / RemoteStorage），不再依赖 config-sync 组。
 */
import type { AppDataGroup } from 'zen-fs-config';
import { getConfigRepo } from './repoBoard';
import { createLogger } from '@richard432/localstorage-logger';

const log = createLogger('retire:settings-group');

export const SETTINGS_GROUP_ID = 'retire-settings';
export const SETTINGS_FILE = '/config.json';

/** 集中配置文件的结构 */
export interface SettingsDocument {
  user?: unknown;
  pension?: unknown;
  health?: unknown;
  sync?: unknown;
  dataSync?: unknown;
}

let groupInstance: AppDataGroup | null = null;

/**
 * 初始化（或恢复）配置数据同步组。
 * 必须在 repo 就绪后调用（connected 事件之后）。
 */
export async function initSettingsGroup(): Promise<AppDataGroup> {
  const repo = getConfigRepo();

  const existing = await repo.listAppDataGroups().catch(() => []);
  const found = existing.some((g: any) => (typeof g === 'string' ? g : g?.id) === SETTINGS_GROUP_ID);

  if (found) {
    groupInstance = await repo.getAppDataGroup(SETTINGS_GROUP_ID);
    log.log('恢复配置数据同步组');
  } else {
    groupInstance = await repo.createAppDataGroup(SETTINGS_GROUP_ID, []);
    log.log('创建配置数据同步组');
  }
  return groupInstance;
}

export function getSettingsGroup(): AppDataGroup {
  if (!groupInstance) {
    throw new Error('[Retire] 配置数据同步组未初始化，请先调用 initSettingsGroup()');
  }
  return groupInstance;
}

/** 读取整份配置文档；不存在返回空对象 */
export async function readSettingsDocument(): Promise<SettingsDocument> {
  const group = getSettingsGroup();
  try {
    const raw = await group.fs.promises.readFile(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** 局部更新配置文档的一个字段（读-改-写，避免覆盖其他字段） */
export async function writeSetting(key: keyof SettingsDocument, value: unknown): Promise<void> {
  const group = getSettingsGroup();
  const doc = await readSettingsDocument();
  doc[key] = value;
  await group.fs.promises.writeFile(SETTINGS_FILE, JSON.stringify(doc, null, 2));
  log.log('写入配置项:', key);
}

/** 整体写入配置文档（迁移时使用） */
export async function writeSettingsDocument(doc: SettingsDocument): Promise<void> {
  const group = getSettingsGroup();
  await group.fs.promises.writeFile(SETTINGS_FILE, JSON.stringify(doc, null, 2));
}

/** 手动触发配置组同步 */
export async function flushSettingsGroup(): Promise<void> {
  const group = getSettingsGroup();
  await group.flush();
}

/** 列出配置组的后端 */
export function listSettingsBackends() {
  return getSettingsGroup().listBackends();
}

export function disposeSettingsGroup(): void {
  groupInstance = null;
}
