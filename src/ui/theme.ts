export type Theme = 'light' | 'dark' | 'auto'

const KEY = 'motiv.theme.v1'
export const DEFAULT_THEME: Theme = 'light'

// Fond de l'appli (--bg dans index.css), repris par la barre d'état et le manifeste. Mêmes valeurs dans index.html.
const LIGHT_BAR = '#f2f2f7'
const DARK_BAR = '#000000'

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' || v === 'auto' ? v : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

/** Couleur du meta `theme-color` pour ce thème : noir en sombre (ou en auto si le téléphone est en sombre). */
export function themeColor(t: Theme, prefersDark: boolean): string {
  return t === 'dark' || (t === 'auto' && prefersDark) ? DARK_BAR : LIGHT_BAR
}

function prefersDark(): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

/** Met à jour (ou crée) le meta `theme-color`. */
function applyThemeColor(t: Theme): void {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = themeColor(t, prefersDark())
}

/** Applique le thème (attribut `data-theme` lu par index.css, meta `theme-color`) et le mémorise sur cet appareil. */
export function setTheme(t: Theme): void {
  document.documentElement.dataset.theme = t
  applyThemeColor(t)
  try {
    localStorage.setItem(KEY, t)
  } catch {
    // stockage indisponible : le thème vaut pour la session
  }
}

/** En « Auto », la barre d'état suit le téléphone quand il passe en clair / sombre pendant que l'appli est ouverte. */
export function followSystemTheme(): void {
  try {
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getTheme() === 'auto') applyThemeColor('auto')
    })
  } catch {
    // matchMedia indisponible
  }
}
