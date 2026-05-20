import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // 路径别名配置
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },

  // 开发服务器配置
  server: {
    port: 3000,
    host: true,
    open: true,
    cors: true,

    // 热更新配置
    hmr: {
      overlay: true,
    },

    // 代理配置（如需后端 API）
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  // 构建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,

    // 代码分割 - 使用函数形式
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 将 React 相关库打包在一起
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          // 将 Three.js 相关库打包在一起
          if (id.includes('three') || id.includes('@react-three')) {
            return 'three-vendor';
          }
          return undefined;
        },
      },
    },

    // chunk 大小警告
    chunkSizeWarningLimit: 1000,
  },

  // 预览配置
  preview: {
    port: 4173,
    host: true,
    open: true,
  },

  // CSS 配置
  css: {
    devSourcemap: true,
  },

  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
    ],
  },

  // 定义全局常量
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },

  // 环境变量前缀
  envPrefix: 'VITE_',
});
