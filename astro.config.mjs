import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  output: 'hybrid',
  adapter: vercel(),
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  vite: {
    optimizeDeps: {
      include: ['@ffmpeg/ffmpeg', '@ffmpeg/util', '@ffmpeg/core'],
      exclude: ['@xenova/transformers'], // 避免预优化导致模型加载问题
    },
    worker: {
      format: 'es',
    },
    server: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
      cors: true,
    },
    define: {
      // 确保环境变量正确设置
      'process.env.NODE_ENV': JSON.stringify('development'),
    },
  },
});
