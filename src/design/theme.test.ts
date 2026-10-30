import { afterEach, describe, expect, test, vi } from 'vitest'
import { getStyle, getTheme, setStyle, setTheme, themeColor } from './theme'

const meta = () => document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')

afterEach(() => {
  document.head.innerHTML = ''
  delete document.documentElement.dataset.theme
  vi.unstubAllGlobals()
})

describe('themeColor', () => {
  test('clair : gris clair, même si le téléphone est en sombre', () => {
    expect(themeColor('light', false)).toBe('#f4f3ef')
    expect(themeColor('light', true)).toBe('#f4f3ef')
  })

  test('sombre : noir, même si le téléphone est en clair', () => {
    expect(themeColor('dark', false)).toBe('#0f1012')
    expect(themeColor('dark', true)).toBe('#0f1012')
  })

  test('auto : suit le téléphone', () => {
    expect(themeColor('auto', false)).toBe('#f4f3ef')
    expect(themeColor('auto', true)).toBe('#0f1012')
  })
})

describe('getTheme', () => {
  test('rien de choisi sur cet appareil : sombre', () => {
    expect(getTheme()).toBe('dark')
  })

  test('valeur inconnue : sombre', () => {
    localStorage.setItem('motiv.theme.v1', 'sepia')
    expect(getTheme()).toBe('dark')
  })
})

describe('setTheme', () => {
  test('crée le meta theme-color s’il manque, puis le met à jour', () => {
    expect(meta()).toBeNull()
    setTheme('dark')
    expect(meta()?.content).toBe('#0f1012')
    setTheme('light')
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1)
    expect(meta()?.content).toBe('#f4f3ef')
  })

  test('met à jour le meta existant (celui d’index.html)', () => {
    const m = document.createElement('meta')
    m.name = 'theme-color'
    m.content = '#f4f3ef'
    document.head.appendChild(m)
    setTheme('dark')
    expect(meta()).toBe(m)
    expect(m.content).toBe('#0f1012')
  })

  test('auto : lit prefers-color-scheme', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(prefers-color-scheme: dark)' }))
    setTheme('auto')
    expect(meta()?.content).toBe('#0f1012')
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    setTheme('auto')
    expect(meta()?.content).toBe('#f4f3ef')
  })

  test('applique data-theme et mémorise le choix', () => {
    setTheme('auto')
    expect(document.documentElement.dataset.theme).toBe('auto')
    expect(getTheme()).toBe('auto')
  })
})

describe('style graphique (essai pixel)', () => {
  test('classique par défaut ; pixel pose data-style et se défait', () => {
    delete document.documentElement.dataset.style
    localStorage.removeItem('motiv.style.v1')
    expect(getStyle()).toBe('classic')
    setStyle('pixel')
    expect(document.documentElement.dataset.style).toBe('pixel')
    expect(getStyle()).toBe('pixel')
    setStyle('classic')
    expect(document.documentElement.dataset.style).toBeUndefined()
    expect(getStyle()).toBe('classic')
  })
})
