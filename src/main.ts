import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './styles/global.css';
import { createIndexes } from './db/indexes';
import { initConfigRepo } from './config/configRepo';
import { useConfigStore } from './stores/config';
import { useDataSyncStore } from './stores/dataSyncStore';

/**
 * 打印 ZenFS 相关库的版本信息
 */
function printZenFSVersions(): void {
  const versions = __ZENFS_VERSIONS__;
  console.group('[ZenFS] 版本信息');
  for (const [name, version] of Object.entries(versions)) {
    console.log(`  ${name}: ${version}`);
  }
  console.groupEnd();
}

// 启动时打印版本信息
printZenFSVersions();

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

/**
 * 注册 Service Worker
 * 手动注册以使用 updateViaCache: 'none'，确保浏览器跳过 HTTP 缓存，
 * 始终获取最新的 sw.js（避免 CDN/服务器 max-age 缓存导致旧版 SW 无法更新）
 */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', {
        scope: './',
        updateViaCache: 'none', // 关键：跳过 HTTP 缓存
      });
      console.log('[PWA] Service Worker 注册成功, scope:', reg.scope);
    } catch (err) {
      console.error('[PWA] Service Worker 注册失败:', err);
      // 注册失败时（可能是旧版 sw.js 缓存导致脚本求值失败），
      // 注销所有现有 SW 后重试
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (regs.length > 0) {
          console.log(`[PWA] 注销 ${regs.length} 个旧 Service Worker 后重试...`);
          await Promise.all(regs.map(r => r.unregister()));
          // 清除所有 SW 缓存
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          }
          await navigator.serviceWorker.register('./sw.js', {
            scope: './',
            updateViaCache: 'none',
          });
          console.log('[PWA] Service Worker 重试注册成功');
        }
      } catch (retryErr) {
        console.error('[PWA] 重试注册仍失败:', retryErr);
      }
    }
  });
}

// 初始化数据库索引
createIndexes().then(() => {
  console.log('数据库索引初始化完成');
}).catch(err => {
  console.error('数据库索引初始化失败:', err);
});

// 初始化配置仓库并加载配置，然后挂载应用
initConfigRepo()
  .then(() => {
    const configStore = useConfigStore(pinia);
    return configStore.loadAll();
  })
  .then(() => {
    // 初始化数据同步
    const dataSyncStore = useDataSyncStore(pinia);
    return dataSyncStore.init();
  })
  .then(() => {
    app.mount('#app');
    console.log('应用已启动');
  })
  .catch(err => {
    console.error('配置仓库初始化失败，降级启动:', err);
    // 即使配置仓库初始化失败，也要挂载应用（降级模式）
    app.mount('#app');
  });

// 注册 Service Worker（独立于应用初始化，不阻塞启动）
registerServiceWorker();
