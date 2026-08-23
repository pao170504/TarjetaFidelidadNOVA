import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        // no precacheamos nada: el service worker solo existe para poder
        // recibir push notifications, no para funcionar offline
        injectionPoint: undefined,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: 'Nova Studio · Fidelidad',
        short_name: 'Nova Studio',
        description: 'Tu tarjeta de fidelidad Nova Studio',
        lang: 'es',
        display: 'standalone',
        scope: '/',
        theme_color: '#863bff',
        background_color: '#c9a227',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
