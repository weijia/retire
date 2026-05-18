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
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
