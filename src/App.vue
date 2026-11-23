<template>
  <div id="app">
    <router-view />

    <!--
      zen-fs-config-ui 同步组配置器：全应用只有一个实例，常驻挂载。
      启动时即 connect('retire') 建立唯一 repo 并发布到 repoBoard，connected 后 bootstrap。
      用 v-show（不是 v-if）保证元素不被卸载重连；只在「设置」页显示。
    -->
    <div v-show="isSettingsPage" class="sync-config-host">
      <div class="sync-config-title">同步组配置（zen FS Config）</div>
      <div ref="syncHost"></div>
    </div>

    <TabBar />
    <UpdateToast />
    <VConsoleButton />
  </div>
</template>

<script setup lang="ts">
import TabBar from './components/TabBar.vue';
import UpdateToast from './components/UpdateToast.vue';
import VConsoleButton from './components/VConsoleButton.vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { defineSyncGroupConfigurator } from 'zen-fs-config-ui/web-component';
import { publishRepo } from './config/repoBoard';
import type { IConfigRepo } from 'zen-fs-config';
import { createLogger } from '@richard432/localstorage-logger';

const log = createLogger('retire:app');
const route = useRoute();
const syncHost = ref<HTMLElement | null>(null);
const isSettingsPage = computed(() => route.path === '/settings');

onMounted(() => {
  defineSyncGroupConfigurator();
  const host = syncHost.value;
  if (!host) return;

  const el = document.createElement('sync-group-configurator');
  el.setAttribute('app-id', 'retire');
  el.addEventListener('connected', (event: Event) => {
    const detail = (event as CustomEvent).detail as { repo?: IConfigRepo; groupType?: string };
    log.log('同步组 connected, groupType:', detail?.groupType, 'repo:', !!detail?.repo);
    publishRepo(detail?.repo || null);
  });
  el.addEventListener('error', (event: Event) => {
    const detail = (event as CustomEvent).detail as { message?: string };
    log.warn('同步组配置器错误:', detail?.message);
  });
  host.appendChild(el);
});
</script>

<style scoped>
.sync-config-host {
  padding: 0 16px 24px;
}
.sync-config-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #333);
  padding: 12px 14px;
  background: var(--card-bg, #fff);
  border-radius: 12px 12px 0 0;
  border-bottom: 1px solid var(--border-color, #eee);
}
</style>
