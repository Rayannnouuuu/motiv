import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

// Icône plein cadre : aucune marge ni fond blanc ajoutés (sinon bordure blanche sur l'écran d'accueil).
const BRAND = '#ea580c'

export default defineConfig({
  preset: {
    ...preset,
    transparent: { ...preset.transparent, padding: 0 },
    maskable: { ...preset.maskable, padding: 0, resizeOptions: { background: BRAND } },
    apple: { ...preset.apple, padding: 0, resizeOptions: { background: BRAND } },
  },
  images: ['public/icon.svg'],
})
