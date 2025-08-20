import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  // 允许通过环境变量自定义应用的基础路径（用于反向代理子路径部署），例如 VITE_BASE_PATH=/app/
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      dts: true,
    }),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false,
          resolveIcons: true,
        }),
      ],
      dts: true,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // 允许通过环境变量覆盖后端地址，方便在反向代理/不同环境下运行
      '/api': {
        target: process.env.VITE_BACKEND_ORIGIN || 'http://localhost:3001',
        changeOrigin: true,
      },
      // 本地开发时，把 /storage 代理到后端文件代理API，使截图 URL 可访问
      '/storage': {
        target: process.env.VITE_BACKEND_ORIGIN || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/storage/, '/api/files/proxy'),
      }
    }
  }
})