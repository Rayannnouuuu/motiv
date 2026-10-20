import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { configDefaults, defineConfig } from 'vitest/config'

// Version d'essai de la refonte : MOTIV_BASE=/motiv/essai/ (voir .github/workflows/deploy.yml).
const BASE = process.env.MOTIV_BASE ?? '/motiv/'
const ESSAI = BASE !== '/motiv/'

export default defineConfig({
  base: BASE,
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
        name: ESSAI ? 'Motiv essai' : 'Motiv',
        short_name: ESSAI ? 'Motiv essai' : 'Motiv',
        description: 'Guitare + sport : le progrès visible chaque jour.',
        lang: 'fr',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        // Thème sombre par défaut (src/design/theme.ts).
        background_color: '#0f1012',
        theme_color: '#0f1012',
      },
      // injectRegister: false désactive l'activation automatique du plugin : on la remet, sinon une nouvelle
      // version attendrait que toutes les fenêtres soient fermées et le rechargement ne viendrait jamais.
      // La version d'essai vit sous /motiv/essai/ : l'appli principale ne doit pas répondre à sa place.
      workbox: {
        navigateFallback: `${BASE}index.html`,
        navigateFallbackDenylist: ESSAI ? [] : [/^\/motiv\/essai\//],
        skipWaiting: true,
        clientsClaim: true,
        // Les polices Barlow aussi : hors ligne (en salle), l'appli garde sa typo.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: 'src/test/setup.ts',
    // Les worktrees des agents vivent dans .claude/ : leurs tests ne sont pas ceux de cette copie.
    exclude: [...configDefaults.exclude, '.claude/**'],
    // Les CSS sont vidés en test, sauf les jetons : tokens.test.ts lit leurs valeurs (contrastes).
    css: { include: [/src\/design\/tokens\.css/] },
  },
})
