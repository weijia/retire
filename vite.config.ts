import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',           // prompt 模式，不自动更新
      injectRegister: 'auto',           // 自动注入 SW 注册代码
      strategies: 'injectManifest',     // 使用自定义 SW
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        injectionPoint: undefined,      // 禁用默认注入点，手动控制
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: {
        name: '退休倒计时',
        short_name: '退休倒计时',
        description: '个人退休规划工具',
        theme_color: '#4A90D9',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '.',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  // 根据环境变量设置 base 路径
  // GitHub Pages 使用仓库名作为子路径
  // WebDAV 部署到 online/retire 子目录
  base: process.env.GITHUB_PAGES === 'true' ? '/retire/' : './',
})
