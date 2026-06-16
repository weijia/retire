<template>
  <div v-if="show" class="update-toast">
    <div class="update-toast-content">
      <span class="update-toast-text">新版本可用</span>
      <button class="update-toast-btn" @click="handleRefresh">
        <span class="update-toast-icon">↻</span>
        点击刷新
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const show = ref(false)
let updateAvailable = false // 去重标志，确保只通知一次

onMounted(() => {
  if (!('serviceWorker' in navigator)) return

  const handleUpdate = (reg: ServiceWorkerRegistration) => {
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        // 新 Worker 已安装且等待中，只通知一次
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          if (!updateAvailable) {
            updateAvailable = true
            console.log('[PWA] 新版本可用')
            show.value = true
          }
        }
      })
    })
  }

  // 注册后监听更新
  navigator.serviceWorker.ready.then((reg) => {
    handleUpdate(reg)
    // 3 秒后检查更新
    setTimeout(() => reg.update().catch(console.error), 3000)
  })

  // 每 5 分钟轮询
  const interval = setInterval(() => {
    navigator.serviceWorker.ready.then((reg) => reg.update().catch(console.error))
  }, 5 * 60 * 1000)

  return () => clearInterval(interval)
})

const handleRefresh = async () => {
  const reg = await navigator.serviceWorker.ready
  const newWorker = reg.waiting
  if (newWorker) {
    // 发送消息让新 SW 跳过等待
    newWorker.postMessage({ type: 'SKIP_WAITING' })
    // 新 SW 激活后刷新页面
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }
  show.value = false
}
</script>

<style scoped>
.update-toast {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}

.update-toast-content {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  padding: 10px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 14px;
}

.update-toast-text {
  white-space: nowrap;
}

.update-toast-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.update-toast-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.update-toast-icon {
  font-size: 14px;
}
</style>
