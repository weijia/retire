/**
 * 一次性数据迁移
 *
 * 背景：老版本用 createConfigRepo('retire', { idbStoreName: 'retire-config' })
 * 建仓；新版本改为由 <sync-group-configurator> 的 connect('retire') 建仓，
 * 默认库名是 zen-fs-config-config-retire —— 两个不同的 IndexedDB 库。
 *
 * 本模块在 App 启动、UI connect 成功之前，用老参数打开老库，
 * 把配置值与数据同步组的业务数据读出来，落到新库（经 repoBoard 发布的 repo）。
 * 迁移完成后写 localStorage 标记，只迁一次；老库数据保留不删（便于回滚）。
 */
import {
  createConfigRepo,
  type IConfigRepo,
  type AppDataGroup,
} from 'zen-fs-config';
import { createLogger } from '@richard432/localstorage-logger';

const log = createLogger('retire:legacy-migrate');

const LEGACY_STORE = 'retire-config';
const MIGRATED_FLAG = 'retire:legacy-migrated-v2';
const LEGACY_CONFIG_PATHS = ['/user', '/pension', '/health', '/sync', '/data-sync'] as const;
const LEGACY_DATA_GROUP = 'retire-data';
const LEGACY_DATA_FILES = [
  '/data/expense-records.json',
  '/data/assets.json',
  '/data/pension-records.json',
  '/data/health-records.json',
  '/data/plans.json',
];

function safeGet<T>(repo: IConfigRepo, path: string): T | undefined {
  try {
    return repo.getConfig<T>(path);
  } catch {
    return undefined;
  }
}

/**
 * 执行一次性迁移。newRepo 是 UI connect 得到的 repo（新库）。
 * 任何失败都不阻断启动（降级：老数据仍在老库）。
 */
export async function migrateLegacyOnce(newRepo: IConfigRepo): Promise<void> {
  if (localStorage.getItem(MIGRATED_FLAG) === '1') {
    log.log('已迁移过，跳过');
    return;
  }

  let legacy: IConfigRepo | null = null;
  try {
    legacy = await createConfigRepo('retire', { idbStoreName: LEGACY_STORE });
    log.log('已打开老配置库', LEGACY_STORE);

    // ---- 1) 老 config repo 的配置值 → 数据组的 /config.json ----
    const settingsDoc: Record<string, unknown> = {};
    for (const path of LEGACY_CONFIG_PATHS) {
      const value = safeGet(legacy, path);
      if (value !== undefined) {
        settingsDoc[path.slice(1)] = value; // '/user' -> 'user'
      }
    }

    // ---- 2) 老数据同步组的业务数据 ----
    const legacyGroups = await legacy.listAppDataGroups().catch(() => []);
    const hadDataGroup = legacyGroups.some((g: any) => (typeof g === 'string' ? g : g?.id) === LEGACY_DATA_GROUP);

    // 老库可能没有任何数据，只有标记也算迁移完成，避免反复打开老库
    const hasAnything = Object.keys(settingsDoc).length > 0 || hadDataGroup;

    if (hasAnything) {
      // 确保新的配置数据同步组存在
      const newGroups = await newRepo.listAppDataGroups().catch(() => []);
      if (!newGroups.some((g: any) => (typeof g === 'string' ? g : g?.id) === 'retire-settings')) {
        await newRepo.createAppDataGroup('retire-settings', []);
      }
      const settingsGroup = await newRepo.getAppDataGroup('retire-settings');
      try {
        await settingsGroup.fs.promises.writeFile('/config.json', JSON.stringify(settingsDoc, null, 2));
        log.log('配置值已写入新数据组');
      } catch (err) {
        log.warn('写入配置值失败', err);
      }

      if (hadDataGroup) {
        const legacyData = await legacy.getAppDataGroup(LEGACY_DATA_GROUP).catch(() => null);
        const newDataGroups = await newRepo.listAppDataGroups().catch(() => []);
        if (!newDataGroups.some((g: any) => (typeof g === 'string' ? g : g?.id) === LEGACY_DATA_GROUP)) {
          await newRepo.createAppDataGroup(LEGACY_DATA_GROUP, []);
        }
        const newData = await newRepo.getAppDataGroup(LEGACY_DATA_GROUP);
        await copyDataFiles(legacyData, newData);
      }
    }

    localStorage.setItem(MIGRATED_FLAG, '1');
    log.log('一次性迁移完成（老库保留未删）');
  } catch (err) {
    log.warn('迁移失败（不影响启动）:', err);
  } finally {
    if (legacy) {
      try { await legacy.dispose(); } catch { /* ignore */ }
    }
  }
}

async function copyDataFiles(src: AppDataGroup | null, dst: AppDataGroup): Promise<void> {
  if (!src) return;
  for (const path of LEGACY_DATA_FILES) {
    try {
      const raw = await src.fs.promises.readFile(path, 'utf-8');
      await dst.fs.promises.writeFile(path, raw);
      log.log('迁移业务数据:', path);
    } catch {
      // 单个文件不存在，跳过
    }
  }
}

/** 供调试：重置迁移标记 */
export function resetMigrationFlag(): void {
  localStorage.removeItem(MIGRATED_FLAG);
}
