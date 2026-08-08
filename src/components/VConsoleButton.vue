<template>
  <button class="vconsole-btn" @click="toggleVConsole" :title="loaded ? '切换 vConsole' : '启动 vConsole'">
    vConsole
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { createLogger } from '@richard432/localstorage-logger';

const log = createLogger('retire:vconsole');

const loaded = ref(false);

async function toggleVConsole() {
  if (!loaded.value) {
    // 首次点击：动态导入并初始化 vConsole
    try {
      const VConsole = (await import('vconsole')).default;
      new VConsole({ theme: 'dark' });
      loaded.value = true;
      log.log('vConsole 已启动');
    } catch (err) {
      log.error('vConsole 加载失败:', err);
    }
  } else {
    // 后续点击：切换 vConsole 面板显示/隐藏
    const el = document.getElementById('__vconsole');
    if (el) {
      el.style.display = el.style.display === 'none' ? '' : 'none';
    }
  }
}
</script>

<style scoped>
.vconsole-btn {
  position: fixed;
  right: 12px;
  bottom: 80px;
  z-index: 9999;
  padding: 4px 10px;
  font-size: 11px;
  color: #fff;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: background 0.2s;
}

.vconsole-btn:active {
  background: rgba(0, 0, 0, 0.8);
}
</style>
