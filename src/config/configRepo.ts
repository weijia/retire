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
  registerBackend,
  wrapZenFSFileSystem,
  type IConfigRepo,
  type BackendMetadata,
  type BackendInstance,
  listBackendMetadata,
} from 'zen-fs-config';

import { createLogger } from '@richard432/localstorage-logger';
import { getConfigRepo as getSharedRepo } from './repoBoard';
const log = createLogger('retire:config');

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
      log.log('调用 registerBackend("Gitee", ...)');
      const { Gitee } = await import('zen-fs-gitee');
      const fs = await Gitee.create(options as any);
      return wrapZenFSFileSystem(fs as any);
    },
    giteeMetadata,
  );
  giteeRegistered = true;
  log.log('Gitee 后端已注册');
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
  log.log('WebDAV 后端已注册');
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
      return wrapZenFSFileSystem(fs as any);
    },
    rsMetadata,
  );
  remoteStorageRegistered = true;
  log.log('RemoteStorage 后端已注册');
}

/**
 * 列出所有已注册后端的 UI 元数据
 * 用于设置页面动态生成后端配置表单
 */
export function getRegisteredBackendMetadata(): BackendMetadata[] {
  return listBackendMetadata();
}

/**
 * 注册所有后端类型（必须在 UI configurator connect 之前调用）。
 *
 * UI 使用的是 zen-fs-config 的 connect()，后端类型来自全局注册表，
 * 因此这里用 registerBackend 注册的 Gitee / WebDAV / RemoteStorage
 * 会被 UI 的表单与连接逻辑直接复用 —— 与 retire 共享同一个 npm 实例。
 */
export function registerAllBackends(): void {
  registerGiteeBackend();
  registerWebDAVBackend();
  registerRemoteStorageBackend();
  log.log('所有后端类型已注册（appId:', APP_ID, '）');
}

/**
 * 获取配置仓库实例。
 *
 * 新架构下 repo 由 App.vue 常驻的 <sync-group-configurator> 建立并发布到
 * repoBoard，这里只做转发；未 connect 前调用会抛错。
 */
export function getConfigRepo(): IConfigRepo {
  return getSharedRepo();
}

/** 兼容旧调用点：仓库已就绪时返回实例，否则返回 null */
export function tryGetConfigRepo(): IConfigRepo | null {
  try {
    return getSharedRepo();
  } catch {
    return null;
  }
}
