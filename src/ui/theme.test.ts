import { afterEach, describe, expect, test, vi } from 'vitest'
import { getTheme, setTheme, themeColor } from './theme'

const meta = () => document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')

afterEach(() => {
  document.head.innerHTML = ''
  delete document.documentElement.dataset.theme
  vi.unstubAllGlobals()
})

describe('themeColor', () => {
  test('clair : gris clair, même si le téléphone est en sombre', () => {
    expect(themeColor('light', false)).toBe('#f2f2f7')
    expect(themeColor('light', true)).toBe('#f2f2f7')
  })

  test('sombre : noir, même si le téléphone est en clair', () => {
    expect(themeColor('dark', false)).toBe('#000000')
    expect(themeColor('dark', true)).toBe('#000000')
  })

  test('auto : suit le téléphone', () => {
    expect(themeColor('auto', false)).toBe('#f2f2f7')
    expect(themeColor('auto', true)).toBe('#000000')
  })
})

describe('setTheme', () => {
  test('crée le meta theme-color s’il manque, puis le met à jour', () => {
    expect(meta()).toBeNull()
    setTheme('dark')
    expect(meta()?.content).toBe('#000000')
    setTheme('light')
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1)
    expect(meta()?.content).toBe('#f2f2f7')
  })

  test('met à jour le meta existant (celui d’index.html)', () => {
    const m = document.createElement('meta')
    m.name = 'theme-color'
    m.content = '#f2f2f7'
    document.head.appendChild(m)
    setTheme('dark')
    expect(meta()).toBe(m)
    expect(m.content).toBe('#000000')
  })

  test('auto : lit prefers-color-scheme', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(prefers-color-scheme: dark)' }))
    setTheme('auto')
    expect(meta()?.content).toBe('#000000')
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    setTheme('auto')
    expect(meta()?.content).toBe('#f2f2f7')
  })

  test('applique data-theme et mémorise le choix', () => {
    setTheme('auto')
    expect(document.documentElement.dataset.theme).toBe('auto')
    expect(getTheme()).toBe('auto')
  })
})
