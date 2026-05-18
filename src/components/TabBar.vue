<template>
  <nav class="tab-bar">
    <router-link to="/" class="tab-item" :class="{ active: currentRoute === 'Home' }">
      <span class="tab-icon">🏠</span>
      <span class="tab-label">首页</span>
    </router-link>
    <router-link to="/assets" class="tab-item" :class="{ active: currentRoute === 'Assets' }">
      <span class="tab-icon">💰</span>
      <span class="tab-label">资产</span>
    </router-link>
    <div class="tab-item fab-wrapper" @click="showFabMenu = true">
      <span class="fab-btn">+</span>
    </div>
    <router-link to="/plans" class="tab-item" :class="{ active: currentRoute === 'Plans' }">
      <span class="tab-icon">📋</span>
      <span class="tab-label">计划</span>
    </router-link>
    <router-link to="/expenses" class="tab-item" :class="{ active: currentRoute === 'Expenses' }">
      <span class="tab-icon">📝</span>
      <span class="tab-label">记录</span>
    </router-link>

    <!-- FAB 弹出菜单 -->
    <div v-if="showFabMenu" class="fab-overlay" @click="showFabMenu = false">
      <div class="fab-menu" @click.stop>
        <div class="fab-menu-item" @click="navigateTo('/assets/add')">
          <span class="fab-menu-icon">🏦</span>
          <span>添加资产</span>
        </div>
        <div class="fab-menu-item" @click="navigateTo('/plans/add')">
          <span class="fab-menu-icon">📋</span>
          <span>添加计划</span>
        </div>
        <div class="fab-menu-item" @click="navigateTo('/expenses/add')">
          <span class="fab-menu-icon">💳</span>
          <span>记录消费</span>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const showFabMenu = ref(false);

const currentRoute = computed(() => route.name as string);

function navigateTo(path: string) {
  showFabMenu.value = false;
  router.push(path);
}
</script>

<style scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: var(--card-bg);
  border-top: 1px solid var(--border);
  padding: 6px 0;
  padding-bottom: calc(6px + env(safe-area-inset-bottom));
  z-index: 50;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: var(--text-light);
  font-size: 11px;
  padding: 4px 12px;
  transition: color 0.2s;
}

.tab-item.active {
  color: var(--primary);
}

.tab-icon {
  font-size: 20px;
  margin-bottom: 2px;
}

.fab-wrapper {
  position: relative;
}

.fab-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -20px;
  box-shadow: 0 2px 8px rgba(74, 144, 217, 0.4);
}

.fab-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 60;
}

.fab-menu {
  position: fixed;
  bottom: 70px;
  right: 20px;
  background: var(--card-bg);
  border-radius: var(--radius);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 61;
}

.fab-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 1px solid var(--border);
}

.fab-menu-item:last-child {
  border-bottom: none;
}

.fab-menu-item:active {
  background: var(--bg);
}

.fab-menu-icon {
  font-size: 18px;
}
</style>
