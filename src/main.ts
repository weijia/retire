import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './styles/global.css';
import { createIndexes } from './db/indexes';
import { initConfigRepo } from './config/configRepo';
import { useConfigStore } from './stores/config';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

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
    app.mount('#app');
    console.log('应用已启动');
  })
  .catch(err => {
    console.error('配置仓库初始化失败，降级启动:', err);
    // 即使配置仓库初始化失败，也要挂载应用（降级模式）
    app.mount('#app');
  });
