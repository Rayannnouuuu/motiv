import { render } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { Splash } from './Splash'

afterEach(() => vi.unstubAllGlobals())

test('animations réduites : pas d’écran d’ouverture', () => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(prefers-reduced-motion: reduce)' }))
  const { container } = render(<Splash />)
  expect(container).toBeEmptyDOMElement()
})

test('une seule fois par ouverture : un rechargement ne la rejoue pas', () => {
  const first = render(<Splash />)
  expect(first.container).not.toBeEmptyDOMElement()
  first.unmount()
  expect(render(<Splash />).container).toBeEmptyDOMElement()
})
