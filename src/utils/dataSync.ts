/**
 * 业务数据云同步管理器
 *
 * 支持多后端手动上传/恢复业务数据（IndexedDB 全量导出为 JSON）。
 * 不同于 zen-fs-config 的自动配置同步，业务数据同步是手动全量备份。
 *
 * 支持后端：Gitee、WebDAV、RemoteStorage
 */
import { exportDb, importDb } from '../db';
import { loadFromGitee, saveToGitee, type GiteeConfig } from './giteeSync';

export interface DataSyncBackend {
  id: string;
  type: string;
  options: Record<string, unknown>;
}

export interface DataSyncConfig {
  backends: DataSyncBackend[];
}

const DATA_FILE_NAME = 'retire-data-backup.json';

/**
 * 上传业务数据到指定后端
 */
export async function uploadDataToBackend(backend: DataSyncBackend): Promise<void> {
  const data = await exportDb();

  switch (backend.type) {
    case 'Gitee':
      await uploadToGitee(backend.options as unknown as GiteeConfig, data);
      break;
    case 'WebDAV':
      await uploadToWebDAV(backend.options, data);
      break;
    case 'RemoteStorage':
      await uploadToRemoteStorage(backend.options, data);
      break;
    default:
      throw new Error(`不支持的后端类型: ${backend.type}`);
  }
}

/**
 * 从指定后端恢复业务数据
 */
export async function downloadDataFromBackend(backend: DataSyncBackend): Promise<void> {
  let data: string;

  switch (backend.type) {
    case 'Gitee':
      data = await downloadFromGitee(backend.options as unknown as GiteeConfig);
      break;
    case 'WebDAV':
      data = await downloadFromWebDAV(backend.options);
      break;
    case 'RemoteStorage':
      data = await downloadFromRemoteStorage(backend.options);
      break;
    default:
      throw new Error(`不支持的后端类型: ${backend.type}`);
  }

  await importDb(data);
}

// ============ Gitee ============

async function uploadToGitee(options: GiteeConfig, data: string): Promise<void> {
  const existing = await loadFromGitee(options);
  await saveToGitee(options, data, existing?.sha);
}

async function downloadFromGitee(options: GiteeConfig): Promise<string> {
  const result = await loadFromGitee(options);
  if (!result) throw new Error('Gitee 上暂无备份数据');
  return result.content;
}

// ============ WebDAV ============

async function uploadToWebDAV(options: Record<string, unknown>, data: string): Promise<void> {
  const { createWebDAVFileSystem } = await import('zen-fs-webdav');
  const fs = createWebDAVFileSystem(options as any);
  await fs.writeFile(`/${DATA_FILE_NAME}`, data, { contentType: 'application/json' });
}

async function downloadFromWebDAV(options: Record<string, unknown>): Promise<string> {
  const { createWebDAVFileSystem } = await import('zen-fs-webdav');
  const fs = createWebDAVFileSystem(options as any);
  const result = await fs.readFile(`/${DATA_FILE_NAME}`, { responseType: 'text' });
  if (typeof result !== 'string') throw new Error('WebDAV 返回的数据格式不正确');
  return result;
}

// ============ RemoteStorage ============

async function uploadToRemoteStorage(options: Record<string, unknown>, data: string): Promise<void> {
  const { createRemoteStorageFileSystem } = await import('zen-fs-remotestoragejs');
  const fs = createRemoteStorageFileSystem(options as any);
  await fs.writeFile(`/${DATA_FILE_NAME}`, data);
}

async function downloadFromRemoteStorage(options: Record<string, unknown>): Promise<string> {
  const { createRemoteStorageFileSystem } = await import('zen-fs-remotestoragejs');
  const fs = createRemoteStorageFileSystem(options as any);
  const result = await fs.readFile(`/${DATA_FILE_NAME}`);
  return new TextDecoder().decode(result);
}
