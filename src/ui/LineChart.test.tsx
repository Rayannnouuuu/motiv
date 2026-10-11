import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { LineChart } from './LineChart'

test('0 point : message', () => {
  render(<LineChart points={[]} />)
  expect(screen.getByText('Pas encore de données')).toBeInTheDocument()
})

test('1 point : un seul cercle, pas de NaN', () => {
  const { container } = render(<LineChart points={[{ day: '2026-10-10', value: 90 }]} />)
  expect(container.querySelectorAll('circle')).toHaveLength(1)
  expect(container.querySelector('polyline')).toBeNull()
  expect(container.innerHTML).not.toContain('NaN')
})

test('n points : une polyline de n points', () => {
  const pts = [
    { day: '2026-10-01', value: 90 },
    { day: '2026-10-05', value: 96 },
    { day: '2026-10-10', value: 96 },
  ]
  const { container } = render(<LineChart points={pts} highlights={[pts[1]]} />)
  expect(container.querySelector('polyline')!.getAttribute('points')!.split(' ')).toHaveLength(3)
  expect(container.querySelectorAll('[data-record]')).toHaveLength(1)
  expect(container.innerHTML).not.toContain('NaN')
})
