/**
 * zen-fs-config 配置管理初始化
 *
 * IndexedDB 始终是本地主后端（offline-first），
 * 远程后端（Gitee 等）作为副本通过 addBackend() 添加后自动双向同步。
 */
import { createConfigRepo, registerBackend, wrapZenFSFileSystem, type IConfigRepo } from 'zen-fs-config';

// 全局单例
let repoInstance: IConfigRepo | null = null;
let initPromise: Promise<IConfigRepo> | null = null;

const APP_ID = 'retire';

/** 标记 Gitee 后端是否已注册（防止重复注册） */
let giteeRegistered = false;

/**
 * 注册 Gitee 后端类型
 * 在初始化配置仓库前调用一次即可
 */
export function registerGiteeBackend(): void {
  if (giteeRegistered) return;
  registerBackend('Gitee', async (options) => {
    const { Gitee } = await import('zen-fs-gitee');
    const fs = await Gitee.create(options as any);
    return wrapZenFSFileSystem(fs as any);
  });
  giteeRegistered = true;
  console.log('[ConfigRepo] Gitee 后端已注册');
}

/**
 * 初始化配置仓库
 * 零参数初始化 — 仅使用 IndexedDB 本地主后端（offline-first）
 * 重新打开只需 appId，IndexedDB + .meta/backends/ 自动恢复所有状态
 */
export async function initConfigRepo(): Promise<IConfigRepo> {
  // 注册 Gitee 后端（幂等）
  registerGiteeBackend();

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
