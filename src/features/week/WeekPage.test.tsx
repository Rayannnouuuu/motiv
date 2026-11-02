import { screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { g, program, ss } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import type { PlannedItem } from '../../domain/dayItems'
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

const added = (day: string, item: PlannedItem, id = 'a1') => ({ profile: { ...EMPTY_PROFILE, planEdits: { added: [{ id, day, item }], hidden: [] } } })

describe('moduler ses journées', () => {
  const programs = [program({ id: 'a', name: 'Haut' })]

  test('ajouter une séance de muscu à un jour à venir', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const { actions } = renderWithData(<WeekPage />, { today, data: { programs } })
    await userEvent.click(screen.getByRole('button', { name: /^Ouvrir ven\. 16 oct\./ }))
    await userEvent.click(within(await screen.findByRole('dialog', { name: /16 oct/ })).getByRole('button', { name: 'Ajouter une séance' }))
    const add = await screen.findByRole('dialog', { name: /^Ajouter une séance/ })
    await userEvent.click(within(add).getByRole('button', { name: /Muscu/ }))
    await userEvent.click(within(add).getByRole('button', { name: 'Haut' }))
    expect(actions.savePlanEdits).toHaveBeenCalledWith({
      added: [{ id: expect.any(String), day: '2026-10-16', item: { kind: 'strength', programId: 'a', name: 'Haut' } }],
      hidden: [],
    })
  })

  test('ajouter une sortie longue : type, distance, enregistrée', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const { actions } = renderWithData(<WeekPage />, { today })
    await userEvent.click(screen.getByRole('button', { name: /^Ouvrir sam\. 17 oct\./ }))
    await userEvent.click(within(await screen.findByRole('dialog', { name: /17 oct/ })).getByRole('button', { name: 'Ajouter une séance' }))
    const add = await screen.findByRole('dialog', { name: /^Ajouter une séance/ })
    await userEvent.click(within(add).getByRole('button', { name: /Course/ }))
    await userEvent.click(within(add).getByRole('button', { name: /Sortie longue/ }))
    await userEvent.click(within(add).getByRole('button', { name: 'Distance +' }))
    await userEvent.click(within(add).getByRole('button', { name: 'Ajouter' }))
    expect(actions.savePlanEdits).toHaveBeenCalledWith({
      added: [{ id: expect.any(String), day: '2026-10-17', item: { kind: 'run', runKind: 'long', km: 16 } }],
      hidden: [],
    })
  })

  test('une séance ajoutée se voit sur son jour, et se déplace à aujourd’hui', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const { actions } = renderWithData(<WeekPage />, { today, data: { programs }, v1: added('2026-10-16', { kind: 'strength', programId: 'a', name: 'Haut' }) })
    const days = within(screen.getByRole('region', { name: 'Jour par jour' })).getAllByRole('listitem')
    expect(within(days[4]).getByText('Haut')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Ouvrir ven\. 16 oct\./ }))
    const day = await screen.findByRole('dialog', { name: /16 oct/ })
    await userEvent.click(within(day).getByRole('button', { name: /Haut/ }))
    const item = await screen.findByRole('dialog', { name: 'Haut' })
    await userEvent.click(within(item).getByRole('button', { name: 'Déplacer à un autre jour' }))
    await userEvent.click(within(item).getByRole('button', { name: "Aujourd'hui" }))
    expect(actions.savePlanEdits).toHaveBeenCalledWith({
      added: [{ id: 'a1', day: today, item: { kind: 'strength', programId: 'a', name: 'Haut' } }],
      hidden: [],
    })
  })

  test('retirer une séance ajoutée', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const { actions } = renderWithData(<WeekPage />, { today, data: { programs }, v1: added('2026-10-16', { kind: 'strength', programId: 'a', name: 'Haut' }) })
    await userEvent.click(screen.getByRole('button', { name: /^Ouvrir ven\. 16 oct\./ }))
    await userEvent.click(within(await screen.findByRole('dialog', { name: /16 oct/ })).getByRole('button', { name: /Haut/ }))
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Haut' })).getByRole('button', { name: 'Retirer de ce jour' }))
    expect(actions.savePlanEdits).toHaveBeenCalledWith({ added: [], hidden: [] })
  })

  test('« Ajouter une séance » : pas sur un jour passé', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    renderWithData(<WeekPage />, { today })
    await userEvent.click(screen.getByRole('button', { name: /^Ouvrir mar\. 13 oct\./ }))
    expect(within(await screen.findByRole('dialog', { name: /13 oct/ })).queryByRole('button', { name: 'Ajouter une séance' })).not.toBeInTheDocument()
  })
})
