import { render } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { Splash } from './Splash'

afterEach(() => vi.unstubAllGlobals())

test('animations réduites : pas d’écran d’ouverture', () => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(prefers-reduced-motion: reduce)' }))
  const { container } = render(<Splash />)
  expect(container).toBeEmptyDOMElement()
})

test('sans canvas (vieux navigateur) : l’appli s’affiche tout de suite', () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  const { container } = render(<Splash />)
  expect(container).toBeEmptyDOMElement()
})
