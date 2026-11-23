import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './styles/global.css';
import { createIndexes } from './db/indexes';
import { registerAllBackends } from './config/configRepo';
import { onRepo, getRepo } from './config/repoBoard';
import { migrateLegacyOnce } from './config/legacyMigrate';
import { useConfigStore } from './stores/config';
import { useDataSyncStore } from './stores/dataSyncStore';
import { createLogger } from '@richard432/localstorage-logger';
const log = createLogger('retire:main');

/**
 * 打印 ZenFS 相关库的版本信息
 */
function printZenFSVersions(): void {
  const versions = __ZENFS_VERSIONS__;
  log.log('=== ZenFS 版本信息 ===');
  for (const [name, version] of Object.entries(versions)) {
    log.log(`  ${name}: ${version}`);
  }
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
      log.log('PWA Service Worker 注册成功, scope:', reg.scope);
    } catch (err) {
      log.error('PWA Service Worker 注册失败:', err);
      // 注册失败时（可能是旧版 sw.js 缓存导致脚本求值失败），
      // 注销所有现有 SW 后重试
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (regs.length > 0) {
          log.log(`PWA 注销 ${regs.length} 个旧 Service Worker 后重试...`);
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
          log.log('PWA Service Worker 重试注册成功');
        }
      } catch (retryErr) {
        log.error('PWA 重试注册仍失败:', retryErr);
      }
    }
  });
}

// 初始化数据库索引
createIndexes().then(() => {
  log.log('数据库索引初始化完成');
}).catch(err => {
  log.error('数据库索引初始化失败:', err);
});

// ============ 启动流程 ============
// 新架构：后端类型先注册；repo 由 App.vue 常驻的 <sync-group-configurator>
// connect 建立并发布到 repoBoard。应用先挂载（UI 才能 connect），
// 再在 repo 就绪后做一次性迁移 + 加载配置 + 初始化业务数据同步。

// 1) 注册后端类型（必须在 UI connect 之前，让 UI 表单拿到元数据）
registerAllBackends();

// 应用立即挂载，configurator 在 App.vue 里随即 connect
app.mount('#app');
log.log('应用已挂载（等待同步组 connected）');

let bootstrapped = false;

/** repo 就绪后：一次性迁移 → 加载配置 → 初始化业务数据同步 */
async function bootstrap(repo: NonNullable<ReturnType<typeof getRepo>>) {
  if (bootstrapped) return;
  bootstrapped = true;
  try {
    // 老库 → 新库，一次性（配置值 + 业务数据）
    await migrateLegacyOnce(repo);

    const configStore = useConfigStore(pinia);
    await configStore.loadAll();

    const dataSyncStore = useDataSyncStore(pinia);
    await dataSyncStore.init();

    log.log('配置与数据同步初始化完成');
  } catch (err) {
    log.error('配置初始化失败（降级运行）:', err);
  }
}

// 订阅 repo：connected 后立即 bootstrap；晚到的 repo 也会补触发
onRepo((repo) => {
  if (repo) void bootstrap(repo);
});
// 兜底：若 configurator 在订阅前已 connected，主动取一次
if (getRepo()) void bootstrap(getRepo()!);

// 注册 Service Worker（独立于应用初始化，不阻塞启动）
registerServiceWorker();
