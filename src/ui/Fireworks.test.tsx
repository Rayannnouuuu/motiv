import { render } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { Fireworks } from './Fireworks'

const mockMotion = (reduce: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduce && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }))

afterEach(() => vi.unstubAllGlobals())

test('animations réduites : rien affiché, fin immédiate', () => {
  mockMotion(true)
  const onDone = vi.fn()
  const { container } = render(<Fireworks size="big" onDone={onDone} />)
  expect(container.querySelector('canvas')).toBeNull()
  expect(onDone).toHaveBeenCalled()
})

test('canvas plein écran sur <body> (hors de l’écran animé), sans bloquer les clics', () => {
  mockMotion(false)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  const { container } = render(<Fireworks size="small" />)
  expect(container.querySelector('canvas')).toBeNull()
  const canvas = document.body.querySelector(':scope > canvas[data-fireworks="small"]')!
  expect(canvas).toHaveClass('pointer-events-none', 'fixed', 'inset-0')
})
