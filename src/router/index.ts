import { createRouter, createWebHashHistory } from 'vue-router';

/**
 * 带缓存失效处理的懒加载
 * 当动态 import 失败时（如 SW 缓存了旧的 chunk 文件名），
 * 自动清除所有缓存并重载页面
 */
function lazyLoad(view: () => Promise<typeof import('*.vue')>) {
  return () => view().catch(async (error: Error) => {
    console.warn('[Router] 动态导入失败:', error.message);
    // 尝试清除 Service Worker 缓存并重载
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }
    // 清除所有缓存
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    }
    // 重载页面
    window.location.reload();
    // 重载失败时返回一个错误占位组件
    return { default: { template: '<div style="padding:40px;text-align:center;color:#999;">加载失败，请刷新页面重试</div>' } };
  });
}

const routes = [
  {
    path: '/',
    name: 'Home',
    component: lazyLoad(() => import('../views/Home.vue')),
  },
  {
    path: '/assets',
    name: 'Assets',
    component: lazyLoad(() => import('../views/Assets.vue')),
  },
  {
    path: '/assets/add',
    name: 'AssetForm',
    component: lazyLoad(() => import('../views/AssetForm.vue')),
  },
  {
    path: '/assets/edit/:id',
    name: 'AssetEdit',
    component: lazyLoad(() => import('../views/AssetForm.vue')),
  },
  {
    path: '/plans',
    name: 'Plans',
    component: lazyLoad(() => import('../views/Plans.vue')),
  },
  {
    path: '/plans/add',
    name: 'PlanForm',
    component: lazyLoad(() => import('../views/PlanForm.vue')),
  },
  {
    path: '/plans/edit/:id',
    name: 'PlanEdit',
    component: lazyLoad(() => import('../views/PlanForm.vue')),
  },
  {
    path: '/expenses',
    name: 'Expenses',
    component: lazyLoad(() => import('../views/Expenses.vue')),
  },
  {
    path: '/expenses/add',
    name: 'ExpenseForm',
    component: lazyLoad(() => import('../views/ExpenseForm.vue')),
  },
  {
    path: '/expenses/edit/:id',
    name: 'ExpenseEdit',
    component: lazyLoad(() => import('../views/ExpenseForm.vue')),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: lazyLoad(() => import('../views/Settings.vue')),
  },
  // 健康相关路由
  {
    path: '/health',
    name: 'HealthProfile',
    component: lazyLoad(() => import('../views/HealthProfile.vue')),
  },
  {
    path: '/health/daily',
    name: 'HealthDaily',
    component: lazyLoad(() => import('../views/HealthDaily.vue')),
  },
  {
    path: '/health/daily/add',
    name: 'HealthDailyForm',
    component: lazyLoad(() => import('../views/HealthDailyForm.vue')),
  },
  {
    path: '/health/result',
    name: 'HealthResult',
    component: lazyLoad(() => import('../views/HealthResult.vue')),
  },
  // 养老金相关路由
  {
    path: '/pension',
    name: 'Pension',
    component: lazyLoad(() => import('../views/Pension.vue')),
  },
  {
    path: '/pension/records',
    name: 'PensionRecords',
    component: lazyLoad(() => import('../views/PensionRecords.vue')),
  },
  {
    path: '/pension/records/add',
    name: 'PensionRecordForm',
    component: lazyLoad(() => import('../views/PensionRecordForm.vue')),
  },
  {
    path: '/pension/records/edit/:id',
    name: 'PensionRecordEdit',
    component: lazyLoad(() => import('../views/PensionRecordForm.vue')),
  },
  {
    path: '/pension/phases/add',
    name: 'PensionPhaseForm',
    component: lazyLoad(() => import('../views/PensionPhaseForm.vue')),
  },
  {
    path: '/pension/phases/edit/:id',
    name: 'PensionPhaseEdit',
    component: lazyLoad(() => import('../views/PensionPhaseForm.vue')),
  },
  {
    path: '/pension/help',
    name: 'PensionHelp',
    component: lazyLoad(() => import('../views/PensionHelp.vue')),
  },
  // 社平工资路由
  {
    path: '/avg-wage',
    name: 'AvgWage',
    component: lazyLoad(() => import('../views/AvgWage.vue')),
  },
  // 灵活就业方案对比
  {
    path: '/pension/flex-compare',
    name: 'FlexCompare',
    component: lazyLoad(() => import('../views/FlexCompare.vue')),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
