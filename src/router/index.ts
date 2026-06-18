import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
  },
  {
    path: '/assets',
    name: 'Assets',
    component: () => import('../views/Assets.vue'),
  },
  {
    path: '/assets/add',
    name: 'AssetForm',
    component: () => import('../views/AssetForm.vue'),
  },
  {
    path: '/assets/edit/:id',
    name: 'AssetEdit',
    component: () => import('../views/AssetForm.vue'),
  },
  {
    path: '/plans',
    name: 'Plans',
    component: () => import('../views/Plans.vue'),
  },
  {
    path: '/plans/add',
    name: 'PlanForm',
    component: () => import('../views/PlanForm.vue'),
  },
  {
    path: '/plans/edit/:id',
    name: 'PlanEdit',
    component: () => import('../views/PlanForm.vue'),
  },
  {
    path: '/expenses',
    name: 'Expenses',
    component: () => import('../views/Expenses.vue'),
  },
  {
    path: '/expenses/add',
    name: 'ExpenseForm',
    component: () => import('../views/ExpenseForm.vue'),
  },
  {
    path: '/expenses/edit/:id',
    name: 'ExpenseEdit',
    component: () => import('../views/ExpenseForm.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
  },
  // 健康相关路由
  {
    path: '/health',
    name: 'HealthProfile',
    component: () => import('../views/HealthProfile.vue'),
  },
  {
    path: '/health/daily',
    name: 'HealthDaily',
    component: () => import('../views/HealthDaily.vue'),
  },
  {
    path: '/health/daily/add',
    name: 'HealthDailyForm',
    component: () => import('../views/HealthDailyForm.vue'),
  },
  {
    path: '/health/result',
    name: 'HealthResult',
    component: () => import('../views/HealthResult.vue'),
  },
  // 养老金相关路由
  {
    path: '/pension',
    name: 'Pension',
    component: () => import('../views/Pension.vue'),
  },
  {
    path: '/pension/records',
    name: 'PensionRecords',
    component: () => import('../views/PensionRecords.vue'),
  },
  {
    path: '/pension/records/add',
    name: 'PensionRecordForm',
    component: () => import('../views/PensionRecordForm.vue'),
  },
  {
    path: '/pension/records/edit/:id',
    name: 'PensionRecordEdit',
    component: () => import('../views/PensionRecordForm.vue'),
  },
  {
    path: '/pension/phases/add',
    name: 'PensionPhaseForm',
    component: () => import('../views/PensionPhaseForm.vue'),
  },
  {
    path: '/pension/phases/edit/:id',
    name: 'PensionPhaseEdit',
    component: () => import('../views/PensionPhaseForm.vue'),
  },
  {
    path: '/pension/help',
    name: 'PensionHelp',
    component: () => import('../views/PensionHelp.vue'),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
