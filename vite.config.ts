import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const MODEL_HOST =
  /^https:\/\/(huggingface\.co|cdn-lfs[^/]*\.(hf|huggingface)\.co|[^/]*\.hf\.co)\//;

export default defineConfig({
  base: process.env.TUFT_BASE ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Tuft',
        short_name: 'Tuft',
        description: 'An on-device scavenger hunt for the real world.',
        theme_color: '#1f3d2b',
        background_color: '#f4f1e8',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,json,wasm,mjs}'],
        runtimeCaching: [
          {
            // The model weights are cached by transformers.js in Cache Storage; this
            // additionally lets the worker revalidate tokenizer/config files offline.
            urlPattern: MODEL_HOST,
            handler: 'CacheFirst',
            options: { cacheName: 'tuft-model-files', cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  worker: { format: 'es' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
  },
});
