// IndexedDB 索引在 db/index.ts 的 upgrade 回调中已定义
// 此文件保留以兼容 main.ts 中的导入

export async function createIndexes() {
  // 索引已在 openDB 的 upgrade 中创建
  console.log('IndexedDB 索引已就绪');
}
