import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'retire_db';
const DB_VERSION = 2;
const STORE_NAME = 'documents';

let dbInstance: IDBPDatabase | null = null;

// 获取/创建数据库
async function getDb(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: '_id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('data_accountType', 'data.accountType', { unique: false });
        store.createIndex('data_year', 'data.year', { unique: false });
        store.createIndex('data_category', 'data.category', { unique: false });
        store.createIndex('data_date', 'data.date', { unique: false });
      } else if (oldVersion < 2) {
        // v1 -> v2: 使用 upgrade 回调提供的 transaction 参数获取 objectStore
        // 不能在 upgrade 回调中调用 db.transaction() 创建新事务
        const store = transaction.objectStore(STORE_NAME);
        if (!store.indexNames.contains('type')) store.createIndex('type', 'type', { unique: false });
        if (!store.indexNames.contains('createdAt')) store.createIndex('createdAt', 'createdAt', { unique: false });
        if (!store.indexNames.contains('data_accountType')) store.createIndex('data_accountType', 'data.accountType', { unique: false });
        if (!store.indexNames.contains('data_year')) store.createIndex('data_year', 'data.year', { unique: false });
        if (!store.indexNames.contains('data_category')) store.createIndex('data_category', 'data.category', { unique: false });
        if (!store.indexNames.contains('data_date')) store.createIndex('data_date', 'data.date', { unique: false });
      }
    },
  });

  return dbInstance;
}

// 获取数据库信息
export async function getDbInfo() {
  const db = await getDb();
  const count = await db.count(STORE_NAME);
  return { name: DB_NAME, doc_count: count };
}

// 创建文档
export async function putDoc(doc: any): Promise<any> {
  const db = await getDb();
  const now = new Date().toISOString();
  // 深拷贝以避免存储 Vue reactive 对象
  const newDoc = JSON.parse(JSON.stringify({
    ...doc,
    createdAt: doc.createdAt || now,
    updatedAt: now,
  }));
  await db.put(STORE_NAME, newDoc);
  return newDoc;
}

// 获取单个文档
export async function getDoc(id: string): Promise<any | undefined> {
  const db = await getDb();
  return db.get(STORE_NAME, id);
}

// 删除文档
export async function removeDoc(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

// 获取所有文档
export async function getAllDocs(type?: string): Promise<any[]> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  let docs: any[];
  if (type) {
    const index = store.index('type');
    docs = await index.getAll(type);
  } else {
    docs = await store.getAll();
  }

  // 按创建时间降序排列
  docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return docs;
}

// 按索引查询
export async function queryByIndex(indexName: string, value: any): Promise<any[]> {
  const db = await getDb();
  const index = db.transaction(STORE_NAME, 'readonly').store.index(indexName);
  const docs = await index.getAll(value);
  docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return docs;
}

// 导出所有数据
export async function exportDb(): Promise<string> {
  const docs = await getAllDocs();
  return JSON.stringify(docs, null, 2);
}

// 导入数据
export async function importDb(jsonStr: string): Promise<void> {
  const docs = JSON.parse(jsonStr);
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  for (const doc of docs) {
    await tx.store.put(doc);
  }
  await tx.done;
}

// 清空数据库
export async function clearDb(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}
