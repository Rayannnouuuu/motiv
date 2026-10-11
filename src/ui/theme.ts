export type Theme = 'light' | 'dark' | 'auto'

const KEY = 'motiv.theme.v1'
export const DEFAULT_THEME: Theme = 'light'

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' || v === 'auto' ? v : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

/** Applique le thème (attribut `data-theme` lu par index.css) et le mémorise sur cet appareil. */
export function setTheme(t: Theme): void {
  document.documentElement.dataset.theme = t
  try {
    localStorage.setItem(KEY, t)
  } catch {
    // stockage indisponible : le thème vaut pour la session
  }
}
