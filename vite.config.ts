import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 100,
    },
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1',
      port: 5173,
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: false, // Keep Service Worker off in development so HMR is fast and never caches old JS
      },
      includeAssets: ['favicon.ico', 'favicon-32x32.png', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png', '**/*.wasm'],
      manifest: {
        name: 'recomp — Nutrition & Body Composition Tracker',
        short_name: 'recomp',
        description: 'Zero-latency, client-side, offline-first calorie and metabolic intervention tracker',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10000000,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,bin}'],
        runtimeCaching: [
          {
            // Google Fonts stylesheets
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            // Google Fonts webfont files (Geist & JetBrains Mono)
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Open Food Facts API response cache
            urlPattern: ({ url }) => url.origin.includes('openfoodfacts.org'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-food-facts-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Transformers.js Hugging Face model weights & WASM
            urlPattern: ({ url }) =>
              url.origin.includes('huggingface.co') ||
              url.pathname.endsWith('.wasm') ||
              url.pathname.endsWith('.onnx'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'transformers-models-cache',
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'esnext',
  },
  worker: {
    format: 'es',
    plugins: () => [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
