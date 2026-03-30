import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** 稳定 vendor 分包，便于浏览器缓存与并行下载；业务 lazy 路由仍单独成块 */
function manualChunk(id: string): string | undefined {
  const s = id.replace(/\\/g, '/');
  if (!s.includes('node_modules')) return undefined;
  // Pro 系为多个包（pro-table、pro-form…），路径未必含 pro-components 字样
  if (s.includes('@ant-design/pro-') || s.includes('@ant-design+pro-')) {
    return 'vendor-pro';
  }
  if (s.includes('@ant-design/icons') || s.includes('@ant-design+icons')) {
    return 'vendor-icons';
  }
  if (s.includes('/node_modules/antd/') || s.includes('node_modules/antd@')) {
    return 'vendor-antd';
  }
  if (s.includes('/node_modules/react-dom/')) return 'vendor-react';
  if (s.includes('/node_modules/react/')) return 'vendor-react';
  if (s.includes('/node_modules/scheduler/')) return 'vendor-react';
  if (s.includes('react-router')) return 'vendor-router';
  if (s.includes('/node_modules/axios/')) return 'vendor-axios';
  if (s.includes('/node_modules/zustand/')) return 'vendor-zustand';
  if (s.includes('/node_modules/dayjs/')) return 'vendor-dayjs';
  return 'vendor-misc';
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const desktop = mode === 'desktop';
  return {
    base: desktop ? './' : '/',
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/static': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: manualChunk,
        },
      },
    },
  };
});
