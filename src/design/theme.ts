export type Theme = 'light' | 'dark' | 'auto'
/** Style graphique : « classic » (défaut) ou « pixel » (essai néo-brutaliste, trait épais et ombre dure). */
export type Style = 'classic' | 'pixel'

const KEY = 'motiv.theme.v1'
// Sombre par défaut ; clair et auto restent au choix dans Réglages.
export const DEFAULT_THEME: Theme = 'dark'

// Fond de l'appli (--bg dans tokens.css), repris par la barre d'état et le manifeste. Mêmes valeurs dans index.html.
const LIGHT_BAR = '#f4f3ef'
const DARK_BAR = '#0f1012'

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' || v === 'auto' ? v : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

/** Couleur du meta `theme-color` pour ce thème : le fond sombre (ou en auto si le téléphone est en sombre). */
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

/** Applique le thème (attribut `data-theme` lu par tokens.css, meta `theme-color`) et le mémorise sur cet appareil. */
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

const STYLE_KEY = 'motiv.style.v1'

export function getStyle(): Style {
  try {
    return localStorage.getItem(STYLE_KEY) === 'pixel' ? 'pixel' : 'classic'
  } catch {
    return 'classic'
  }
}

/** Applique le style (attribut `data-style` lu par tokens.css) et le mémorise sur cet appareil. */
export function setStyle(st: Style): void {
  if (st === 'pixel') document.documentElement.dataset.style = 'pixel'
  else delete document.documentElement.dataset.style
  try {
    localStorage.setItem(STYLE_KEY, st)
  } catch {
    // stockage indisponible : le style vaut pour la session
  }
}
