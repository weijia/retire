import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './styles/global.css';
import { createIndexes } from './db/indexes';

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

app.mount('#app');
