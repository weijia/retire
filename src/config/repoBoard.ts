/**
 * 共享 repo 公告板
 *
 * 唯一的 ConfigRepo 由 App.vue 常驻的 <sync-group-configurator> connect 建立
 * （appId = retire，默认 IndexedDB 库 zen-fs-config-config-retire）。
 * 这里只保存并分发那一次 connect 的结果，不创建 repo、不 connect，
 * 从而避免多个 store 各自 createConfigRepo 造成「双库 / 双 watch」冲突。
 *
 * 参考 zip-browser/web/config-repo.js 的已验证实现。
 */
import type { IConfigRepo } from 'zen-fs-config';

let currentRepo: IConfigRepo | null = null;
const listeners = new Set<(repo: IConfigRepo | null) => void>();

/** 当前 connect 得到的 repo；connected 事件到来前为 null。 */
export function getRepo(): IConfigRepo | null {
  return currentRepo;
}

/** 兼容旧调用点：拿到 repo 或抛错。 */
export function getConfigRepo(): IConfigRepo {
  if (!currentRepo) {
    throw new Error('[Retire] 同步组尚未连接，配置仓库未就绪');
  }
  return currentRepo;
}

/** 由 App.vue 在 connected / 断开时发布。 */
export function publishRepo(repo: IConfigRepo | null): void {
  currentRepo = repo || null;
  for (const listener of [...listeners]) {
    try {
      listener(currentRepo);
    } catch (err) {
      console.warn('[retire:repoBoard] listener failed', err);
    }
  }
}

/** 订阅 repo 变化；若已有 repo 会立即回调一次（覆盖晚订阅者）。 */
export function onRepo(listener: (repo: IConfigRepo | null) => void): () => void {
  listeners.add(listener);
  if (currentRepo) {
    try {
      listener(currentRepo);
    } catch (err) {
      console.warn('[retire:repoBoard] listener failed', err);
    }
  }
  return () => listeners.delete(listener);
}
