/**
 * zen-fs-config 配置管理初始化
 *
 * IndexedDB 始终是本地主后端（offline-first），
 * 远程后端（Gitee、WebDAV、RemoteStorage 等）作为副本通过 addBackend() 添加后自动双向同步。
 *
 * 使用 zen-fs-config 0.5.x 的缓存层架构：
 * - 远程副本后端自动被 CachedFileSystem 包装
 * - 通过 getRevision 钩子实现零下载重校验
 * - 缓存数据持久化到 IndexedDB
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
 *
 * GiteeFS 已实现 getRevision() 钩子（返回 Git blob SHA，零网络往返），
 * 并自动将 shaCache、contentCache、mtimeCache 持久化到 IndexedDB，实现跨会话热启动。
 */
export function registerGiteeBackend(): void {
  if (giteeRegistered) return;

  // Gitee 后端的 UI 元数据（字段定义 + 默认值）
  const giteeMetadata: BackendMetadata = {
    type: 'Gitee',
    label: 'Gitee 仓库',
    icon: '🦊',
    fields: [
      { key: 'token', label: '访问令牌', type: 'password', placeholder: 'Gitee 私人令牌', required: true },
      { key: 'owner', label: '用户名', type: 'text', placeholder: 'Gitee 用户名', required: true },
      { key: 'repo', label: '仓库名', type: 'text', placeholder: '仓库名称', required: true },
      { key: 'branch', label: '分支名', type: 'text', placeholder: '默认 master' },
      { key: 'baseUrl', label: 'API 地址', type: 'text', placeholder: 'https://gitee.com/api/v5' },
    ],
    defaultOptions: {
      owner: '',
      repo: '',
      branch: 'master',
      token: '',
      baseUrl: 'https://gitee.com/api/v5',
    },
    // 声明可被 data-sync 后端复用的账号字段
    accountFields: ['token', 'owner'],
  };

  registerBackend(
    'Gitee',
    async (options) => {
      console.log('[Retire] 调用 registerBackend("Gitee", ...)');
      const { Gitee } = await import('zen-fs-gitee');
      const fs = await Gitee.create(options as any);
      const backend = wrapZenFSFileSystem(fs as any);

      // shouldSync：通过 tree SHA 检测远端变更
      const { owner, repo, branch = 'master', token, baseUrl = 'https://gitee.com/api/v5' } = options as any;
      const cacheKey = `zen-fs-gitee-sync:${owner}/${repo}/${branch}`;
      (backend as any).shouldSync = async (): Promise<boolean> => {
        try {
          const base = baseUrl.replace(/\/$/, '');
          const headers: Record<string, string> = {};
          if (token) headers['Authorization'] = `token ${token}`;
          const branchRes = await fetch(`${base}/repos/${owner}/${repo}/branches/${branch}`, { headers });
          if (!branchRes.ok) return true;
          const commitSha = (await branchRes.json())?.commit?.sha;
          if (!commitSha) return true;
          const commitRes = await fetch(`${base}/repos/${owner}/${repo}/git/commits/${commitSha}`, { headers });
          if (!commitRes.ok) return true;
          const treeSha = (await commitRes.json())?.tree?.sha;
          if (!treeSha) return true;
          const cached = localStorage.getItem(cacheKey);
          if (cached === treeSha) return false;
          localStorage.setItem(cacheKey, treeSha);
          return true;
        } catch { return true; }
      };

      return backend;
    },
    giteeMetadata,
  );
  giteeRegistered = true;
  console.log('[Retire] Gitee 后端已注册');
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
    icon: '☁️',
    fields: [
      { key: 'url', label: '服务器地址', type: 'text', placeholder: 'https://dav.example.com/remote.php/dav/files/', required: true },
      { key: 'username', label: '用户名', type: 'text', placeholder: 'WebDAV 用户名' },
      { key: 'password', label: '密码', type: 'password' },
      { key: 'rootPath', label: '根路径', type: 'text', placeholder: '/zen-fs-config/' },
    ],
    defaultOptions: {
      url: '',
      username: '',
      password: '',
      rootPath: '/',
    },
    // 声明可被 data-sync 后端复用的账号字段
    accountFields: ['url', 'username', 'password'],
  };

  registerBackend(
    'WebDAV',
    async (options): Promise<BackendInstance> => {
      const url = options.url as string;
      const username = options.username as string;
      const password = options.password as string;
      const rootPath = (options.rootPath as string) || '/';
      
      if (!url) throw new Error('WebDAV backend requires "url" option');
      
      const authHeader = username ? `Basic ${btoa(`${username}:${password || ''}`)}` : '';
      
      const davUrl = (path: string) => {
        const cleanRoot = rootPath.replace(/\/$/, '');
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${url.replace(/\/$/, '')}${cleanRoot}${cleanPath}`;
      };
      
      const davFetch = async (path: string, method: string, body?: string) => {
        const headers: Record<string, string> = {};
        if (authHeader) headers['Authorization'] = authHeader;
        if (body) headers['Content-Type'] = 'application/xml';
        const res = await fetch(davUrl(path), { method, headers, body });
        if (!res.ok && res.status !== 404) throw new Error(`WebDAV ${res.status}`);
        return res;
      };

      const adapter: BackendInstance = {
        readFile: async (path: string) => {
          const res = await davFetch(path, 'GET');
          if (!res.ok) throw new Error(`WebDAV readFile failed: ${res.status}`);
          return res.text();
        },
        writeFile: async (path: string, data: string | Uint8Array | ArrayBuffer) => {
          const content = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
          await davFetch(path, 'PUT', content);
        },
        readdir: async (path: string): Promise<string[]> => {
          const res = await davFetch(path, 'PROPFIND');
          if (!res.ok) return [];
          const text = await res.text();
          // 简单解析 WebDAV 目录列表
          const matches = text.matchAll(/<d:href>([^<]+)<\/d:href>/g);
          const entries: string[] = [];
          for (const match of matches) {
            const href = match[1];
            const name = href.split('/').filter(Boolean).pop() || '';
            if (name && name !== path.split('/').filter(Boolean).pop()) {
              entries.push(name);
            }
          }
          return entries;
        },
        stat: async (path: string) => {
          const res = await davFetch(path, 'HEAD');
          return {
            isFile: () => res.ok,
            isDirectory: () => !res.ok,
            size: parseInt(res.headers.get('content-length') || '0'),
            mtime: new Date(res.headers.get('last-modified') || Date.now()),
          };
        },
        exists: async (path: string) => {
          const res = await davFetch(path, 'HEAD');
          return res.ok;
        },
        mkdir: async (path: string) => {
          await davFetch(path, 'MKCOL');
        },
        unlink: async (path: string) => {
          await davFetch(path, 'DELETE');
        },
        rmdir: async (path: string) => {
          await davFetch(path, 'DELETE');
        },
        rename: async (oldPath: string, newPath: string) => {
          const headers: Record<string, string> = { Destination: davUrl(newPath) };
          if (authHeader) headers['Authorization'] = authHeader;
          await fetch(davUrl(oldPath), { method: 'MOVE', headers });
        },
      };

      return adapter;
    },
    webdavMetadata,
  );
  webdavRegistered = true;
  console.log('[Retire] WebDAV 后端已注册');
}

/** 标记 RemoteStorage 后端是否已注册（防止重复注册） */
let remoteStorageRegistered = false;

/**
 * 注册 RemoteStorage 后端类型（含 UI 元数据）
 *
 * zen-fs-remotestoragejs 的 RemoteStorageFileSystem 继承自 @zenfs/core 的 FileSystem，
 * 可直接用 wrapZenFSFileSystem 包装为 BackendInstance。
 *
 * RemoteStorageFileSystem 已实现 getRevision() 钩子（返回 HTTP ETag），
 * 并自动将目录列表缓存、ETag 快照、mtime 缓存持久化到 IndexedDB。
 * shouldSync() 在首次调用时从 IndexedDB 恢复快照，若 root ETag 未变则跳过全量扫描。
 */
export function registerRemoteStorageBackend(): void {
  if (remoteStorageRegistered) return;

  const rsMetadata: BackendMetadata = {
    type: 'RemoteStorage',
    label: 'RemoteStorage',
    icon: '📡',
    fields: [
      { key: 'href', label: '用户地址', type: 'text', placeholder: 'user@5apps.com', required: true },
      { key: 'token', label: '访问令牌', type: 'password', placeholder: 'Bearer Token', required: true },
      { key: 'basePath', label: '存储路径', type: 'text', placeholder: '/zen-fs-config/' },
    ],
    defaultOptions: {
      href: '',
      token: '',
      basePath: '/zen-fs-config/',
    },
    // 声明可被 data-sync 后端复用的账号字段
    accountFields: ['href', 'token'],
  };

  registerBackend(
    'RemoteStorage',
    async (options) => {
      const { createRemoteStorageFileSystem } = await import('zen-fs-remotestoragejs');
      const fs = createRemoteStorageFileSystem({
        href: options.href as string,
        token: options.token as string,
        basePath: options.basePath as string,
      });

      const backend = fs as any;

      // 包装 stat：目录路径直接返回目录 stat，避免对不存在的资源发 HEAD 请求
      const originalStat = backend.stat?.bind(backend);
      if (originalStat) {
        backend.stat = async (path: string) => {
          const looksLikeDir =
            path.endsWith('/') ||
            (!path.split('/').pop()?.includes('.') && path !== '/') ||
            path.includes('/.meta/');

          if (looksLikeDir) {
            return {
              isFile: () => false,
              isDirectory: () => true,
              size: 0,
              mtime: new Date(0),
            };
          }

          try {
            return await originalStat(path);
          } catch {
            return {
              isFile: () => false,
              isDirectory: () => false,
              size: 0,
              mtime: new Date(0),
            };
          }
        };
      }

      // 包装 getRevision：目录路径直接返回 null
      const originalGetRevision = backend.getRevision?.bind(backend);
      if (originalGetRevision) {
        backend.getRevision = async (path: string) => {
          const looksLikeDir =
            path.endsWith('/') ||
            (!path.split('/').pop()?.includes('.') && path !== '/') ||
            path.includes('/.meta/');

          if (looksLikeDir) return null;

          try {
            return await originalGetRevision(path);
          } catch {
            return null;
          }
        };
      }

      return backend as BackendInstance;
    },
    rsMetadata,
  );
  remoteStorageRegistered = true;
  console.log('[Retire] RemoteStorage 后端已注册');
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
 *
 * 缓存层默认开启：远程副本后端自动被 CachedFileSystem 包装，
 * 通过 getRevision 钩子实现零下载重校验。
 */
export async function initConfigRepo(): Promise<IConfigRepo> {
  console.log('[Retire] 调用 initConfigRepo()');
  // 注册所有后端类型（幂等）
  registerGiteeBackend();
  registerWebDAVBackend();
  registerRemoteStorageBackend();

  // 已初始化，直接返回
  if (repoInstance) {
    console.log('[Retire] 配置仓库已初始化，返回现有实例');
    return repoInstance;
  }

  // 正在初始化，返回同一个 Promise（防止并发）
  if (initPromise) {
    console.log('[Retire] 配置仓库正在初始化，等待完成');
    return initPromise;
  }

  initPromise = (async () => {
    console.log('[Retire] 调用 createConfigRepo()');
    const repo = await createConfigRepo(APP_ID, {
      idbStoreName: 'retire-config',
      // 缓存配置：默认启用 IdbCacheStore（IndexedDB 持久化）
      // cache: {}, // 使用默认配置
    });
    repoInstance = repo;
    console.log('[Retire] 配置仓库初始化完成，appId:', APP_ID);
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
    throw new Error('[Retire] 配置仓库未初始化，请先调用 initConfigRepo()');
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
    console.log('[Retire] 配置仓库已释放');
  }
}
