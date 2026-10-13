import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/motiv/',
  // Affichés dans Réglages › Version. GitHub Actions fournit GITHUB_SHA.
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __BUILD_SHA__: JSON.stringify((process.env.GITHUB_SHA ?? 'local').slice(0, 7)),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Enregistré par src/main.tsx (setupUpdates) pour contrôler le moment du rechargement.
      injectRegister: false,
      // Le meta theme-color vient d'index.html (mis à jour selon le thème) : pas de doublon injecté.
      pwaAssets: { config: true, injectThemeColor: false },
      manifest: {
        name: 'Motiv',
        short_name: 'Motiv',
        description: 'Guitare + sport : le progrès visible chaque jour.',
        lang: 'fr',
        start_url: '/motiv/',
        scope: '/motiv/',
        display: 'standalone',
        background_color: '#f2f2f7',
        theme_color: '#f2f2f7',
      },
      // injectRegister: false désactive l'activation automatique du plugin : on la remet, sinon une nouvelle
      // version attendrait que toutes les fenêtres soient fermées et le rechargement ne viendrait jamais.
      workbox: { navigateFallback: '/motiv/index.html', importScripts: ['push-sw.js'], skipWaiting: true, clientsClaim: true },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: 'src/test/setup.ts',
  },
})
