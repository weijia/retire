/**
 * zen-fs-config 配置管理初始化
 *
 * IndexedDB 始终是本地主后端（offline-first），
 * 远程后端（Gitee、WebDAV、RemoteStorage 等）作为副本通过 addBackend() 添加后自动双向同步。
 */
import {
  createConfigRepo,
  registerBackend,
  wrapZenFSFileSystem,
  type IConfigRepo,
  type BackendMetadata,
  type BackendInstance,
  listBackendMetadata,
} from 'zen-fs-config';

// 全局单例
let repoInstance: IConfigRepo | null = null;
let initPromise: Promise<IConfigRepo> | null = null;

const APP_ID = 'retire';

/** 标记 Gitee 后端是否已注册（防止重复注册） */
let giteeRegistered = false;

/**
 * 注册 Gitee 后端类型（含 UI 元数据，用于设置页面动态生成表单）
 * 在初始化配置仓库前调用一次即可
 */
export function registerGiteeBackend(): void {
  if (giteeRegistered) return;

  // Gitee 后端的 UI 元数据（字段定义 + 默认值）
  const giteeMetadata: BackendMetadata = {
    type: 'Gitee',
    label: 'Gitee 仓库',
    icon: '🔧',
    fields: [
      { key: 'token', label: '访问令牌', type: 'password', placeholder: 'Gitee 私人令牌', required: true },
      { key: 'owner', label: '用户名', type: 'text', placeholder: 'Gitee 用户名', required: true },
      { key: 'repo', label: '仓库名', type: 'text', placeholder: '仓库名称', required: true },
      { key: 'branch', label: '分支名', type: 'text', placeholder: '默认 master' },
    ],
    defaultOptions: {
      owner: '',
      repo: '',
      branch: 'master',
      token: '',
    },
    // 声明可被 data-sync 后端复用的账号字段
    accountFields: ['token', 'owner'],
  };

  registerBackend(
    'Gitee',
    async (options) => {
      const { Gitee } = await import('zen-fs-gitee');
      const fs = await Gitee.create(options as any);
      return wrapZenFSFileSystem(fs as any);
    },
    giteeMetadata,
  );
  giteeRegistered = true;
  console.log('[ConfigRepo] Gitee 后端已注册（含 UI 元数据）');
}

/** 标记 WebDAV 后端是否已注册（防止重复注册） */
let webdavRegistered = false;

/**
 * 注册 WebDAV 后端类型（含 UI 元数据）
 *
 * zen-fs-webdav 的 WebDAVFileSystem 是独立接口（非 ZenFS FileSystem 子类），
 * 方法名 readDir（大写 D）与 BackendInstance.readdir 不一致，
 * writeFile 返回 WebDAVResult 而非 void，因此需要手动适配器。
 */
export function registerWebDAVBackend(): void {
  if (webdavRegistered) return;

  const webdavMetadata: BackendMetadata = {
    type: 'WebDAV',
    label: 'WebDAV 服务器',
    icon: '🌐',
    fields: [
      { key: 'baseUrl', label: '服务器地址', type: 'text', placeholder: 'https://example.com/webdav', required: true },
      { key: 'username', label: '用户名', type: 'text', placeholder: 'WebDAV 用户名' },
      { key: 'password', label: '密码', type: 'password', placeholder: 'WebDAV 密码' },
      { key: 'token', label: '认证令牌', type: 'password', placeholder: '替代用户名/密码的令牌' },
    ],
    defaultOptions: {
      baseUrl: '',
      username: '',
      password: '',
      token: '',
    },
    // 声明可被 data-sync 后端复用的账号字段
    accountFields: ['baseUrl', 'username', 'password', 'token'],
  };

  registerBackend(
    'WebDAV',
    async (options): Promise<BackendInstance> => {
      const { createWebDAVFileSystem } = await import('zen-fs-webdav');
      const webdavFs = createWebDAVFileSystem(options as any);

      // 适配器：将 WebDAV 接口转换为 BackendInstance
      const adapter: BackendInstance = {
        readFile: (path: string) => webdavFs.readFile(path) as Promise<any>,
        writeFile: async (path: string, data: string | Uint8Array | ArrayBuffer) => {
          await webdavFs.writeFile(path, data as any);
        },
        readdir: async (path: string): Promise<string[]> => {
          // WebDAV 的 readDir 返回 Stats[]，BackendInstance 需要 string[]
          const entries = await webdavFs.readDir(path);
          return entries.map(e => e.name);
        },
        stat: (path: string) => webdavFs.stat(path) as Promise<any>,
        exists: (path: string) => webdavFs.exists(path),
        mkdir: (path: string) => webdavFs.mkdir(path) as Promise<any>,
        unlink: (path: string) => webdavFs.unlink(path),
        rmdir: (path: string) => webdavFs.rmdir(path) as Promise<void>,
        rename: async (oldPath: string, newPath: string) => {
          await webdavFs.move(oldPath, newPath);
        },
      };

      return adapter;
    },
    webdavMetadata,
  );
  webdavRegistered = true;
  console.log('[ConfigRepo] WebDAV 后端已注册（含 UI 元数据）');
}

/** 标记 RemoteStorage 后端是否已注册（防止重复注册） */
let remoteStorageRegistered = false;

/**
 * 注册 RemoteStorage 后端类型（含 UI 元数据）
 *
 * zen-fs-remotestoragejs 的 RemoteStorageFileSystem 继承自 @zenfs/core 的 FileSystem，
 * 可直接用 wrapZenFSFileSystem 包装为 BackendInstance。
 */
export function registerRemoteStorageBackend(): void {
  if (remoteStorageRegistered) return;

  const rsMetadata: BackendMetadata = {
    type: 'RemoteStorage',
    label: 'RemoteStorage',
    icon: '🔄',
    fields: [
      { key: 'href', label: '服务器地址', type: 'text', placeholder: 'https://storage.example.com/user', required: true },
      { key: 'token', label: '访问令牌', type: 'password', placeholder: 'Bearer Token', required: true },
      { key: 'basePath', label: '存储路径', type: 'text', placeholder: '/retire-config' },
    ],
    defaultOptions: {
      href: '',
      token: '',
      basePath: '/retire-config',
    },
    // 声明可被 data-sync 后端复用的账号字段
    accountFields: ['href', 'token'],
  };

  registerBackend(
    'RemoteStorage',
    async (options) => {
      const { createRemoteStorageFileSystem } = await import('zen-fs-remotestoragejs');
      const fs = createRemoteStorageFileSystem(options as any);
      return wrapZenFSFileSystem(fs as any);
    },
    rsMetadata,
  );
  remoteStorageRegistered = true;
  console.log('[ConfigRepo] RemoteStorage 后端已注册（含 UI 元数据）');
}

/**
 * 列出所有已注册后端的 UI 元数据
 * 用于设置页面动态生成后端配置表单
 */
export function getRegisteredBackendMetadata(): BackendMetadata[] {
  return listBackendMetadata();
}

/**
 * 初始化配置仓库
 * 零参数初始化 — 仅使用 IndexedDB 本地主后端（offline-first）
 * 重新打开只需 appId，IndexedDB + .meta/backends/ 自动恢复所有状态
 */
export async function initConfigRepo(): Promise<IConfigRepo> {
  // 注册所有后端类型（幂等）
  registerGiteeBackend();
  registerWebDAVBackend();
  registerRemoteStorageBackend();

  // 已初始化，直接返回
  if (repoInstance) return repoInstance;

  // 正在初始化，返回同一个 Promise（防止并发）
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const repo = await createConfigRepo(APP_ID, {
      idbStoreName: 'retire-config',
    });
    repoInstance = repo;
    console.log('[ConfigRepo] 初始化完成，appId:', APP_ID);
    return repo;
  })();

  try {
    return await initPromise;
  } catch (err) {
    // 初始化失败，清理状态以便重试
    initPromise = null;
    throw err;
  }
}

/**
 * 获取配置仓库实例（必须先调用 initConfigRepo）
 */
export function getConfigRepo(): IConfigRepo {
  if (!repoInstance) {
    throw new Error('[ConfigRepo] 未初始化，请先调用 initConfigRepo()');
  }
  return repoInstance;
}

/**
 * 释放配置仓库资源
 */
export async function disposeConfigRepo(): Promise<void> {
  if (repoInstance) {
    await repoInstance.dispose();
    repoInstance = null;
    initPromise = null;
    console.log('[ConfigRepo] 已释放');
  }
}
