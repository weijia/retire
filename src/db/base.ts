import { putDoc, getDoc, removeDoc, getAllDocs } from './index';

// 生成UUID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// 获取当前ISO时间
function now(): string {
  return new Date().toISOString();
}

// 基础文档接口
interface DocWithData {
  _id: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  data: any;
}

// 基础CRUD服务
export class BaseService<T = DocWithData> {
  protected docType: string;
  protected idPrefix: string;

  constructor(docType: string, idPrefix: string) {
    this.docType = docType;
    this.idPrefix = idPrefix;
  }

  // 创建文档
  async create(data: any): Promise<T> {
    const id = `${this.idPrefix}_${generateId()}`;
    const doc = {
      _id: id,
      type: this.docType,
      createdAt: now(),
      updatedAt: now(),
      data,
    };
    const result = await putDoc(doc);
    return result as T;
  }

  // 更新文档
  async update(id: string, changes: any): Promise<T> {
    const existing = await getDoc(id);
    if (!existing) throw new Error(`文档 ${id} 不存在`);

    const updated = {
      ...existing,
      data: { ...existing.data, ...changes },
      updatedAt: now(),
    };
    await putDoc(updated);
    return updated as T;
  }

  // 删除文档
  async remove(id: string): Promise<void> {
    await removeDoc(id);
  }

  // 根据ID获取
  async getById(id: string): Promise<T | null> {
    const doc = await getDoc(id);
    return (doc as T) || null;
  }

  // 获取所有该类型的文档
  async getAll(): Promise<T[]> {
    const docs = await getAllDocs(this.docType);
    return docs as T[];
  }
}
