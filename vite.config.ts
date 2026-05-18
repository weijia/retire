import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 根据环境变量设置 base 路径
  // GitHub Pages 使用仓库名作为子路径
  // WebDAV 部署到 online/retire 子目录
  base: process.env.GITHUB_PAGES === 'true' ? '/retire/' : './',
})
