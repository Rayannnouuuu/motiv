import { screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { g, program, ss } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { EMPTY_PROFILE } from '../../domain/model'
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

test('plan : semaine d’après, et « Mes dispos » marque un jour indisponible', async () => {
  const { profile } = await import('../../domain/marathon/fixtures')
  const { default: userEvent } = await import('@testing-library/user-event')
  const m = profile({ startedOn: '2026-10-12', offDays: ['2026-10-17'] })
  const { actions } = renderWithData(<WeekPage />, { today, v1: { profile: { ...EMPTY_PROFILE, marathon: m } } })
  const days = within(screen.getByRole('region', { name: 'Jour par jour' })).getAllByRole('listitem')
  expect(within(days[5]).getByText('Indisponible')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Mes dispos' }))
  await userEvent.click(screen.getByRole('switch', { name: /^Disponible le ven\. 16 oct\./ }))
  expect(actions.setOffDay).toHaveBeenCalledWith('2026-10-16', true)
  await userEvent.click(screen.getByRole('button', { name: "Semaine d'après" }))
  expect(screen.getByText('Semaine prochaine')).toBeInTheDocument()
})
