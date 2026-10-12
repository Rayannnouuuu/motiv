import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/motiv/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      pwaAssets: { config: true },
      manifest: {
        name: 'Motiv',
        short_name: 'Motiv',
        description: 'Guitare + sport : le progrès visible chaque jour.',
        lang: 'fr',
        start_url: '/motiv/',
        scope: '/motiv/',
        display: 'standalone',
        background_color: '#fafaf9',
        theme_color: '#fafaf9',
      },
      workbox: { navigateFallback: '/motiv/index.html', importScripts: ['push-sw.js'] },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: 'src/test/setup.ts',
  },
})
