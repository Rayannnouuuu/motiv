import { screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { g, program, ss } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { WeekPage } from './WeekPage'

const today = '2026-10-15' // jeudi

test('sans plan : objectifs de la semaine, jour par jour, ce qui est fait se corrige', () => {
  const programs = [program({ id: 'a', name: 'Haut' })]
  const guitar = g('2026-10-13', 40)
  renderWithData(<WeekPage />, { today, data: { programs, guitarSessions: [guitar], sportSessions: [ss([], '2026-10-12', 'a')] } })
  expect(screen.getByText('Semaine 42 · 12 – 18 oct.')).toBeInTheDocument()
  expect(screen.getByText('2 / 8 séances')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '2 séances sur 8' })).toBeInTheDocument()
  const days = within(screen.getByRole('region', { name: 'Jour par jour' })).getAllByRole('listitem')
  expect(days).toHaveLength(7)
  expect(within(days[0]).getByRole('link', { name: 'Haut' })).toHaveAttribute('href', expect.stringMatching(/^\/log\/corriger\//))
  expect(within(days[1]).getByRole('link', { name: 'Guitare 40 min' })).toHaveAttribute('href', `/log/corriger/${guitar.id}`)
  expect(within(days[2]).getByText('Repos')).toBeInTheDocument()
  expect(days[3]).toHaveAttribute('aria-current', 'date')
})
