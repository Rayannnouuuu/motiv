import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { g, ss } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { LevelUpWatcher } from './LevelUpWatcher'
import { loadSeen, saveSeen } from './seenLevels'

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => vi.useRealTimers())

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

test('premier passage : niveaux mémorisés, pas d’animation', async () => {
  renderWithData(<LevelUpWatcher />, { data: { guitarSessions: [g('2026-10-14', 60, [], 1200)], sportSessions: [ss([], '2026-10-14', 'p1', 600)] } })
  await advance(3000)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(loadSeen()).toEqual({ global: 2, guitar: 1, sport: 1 })
})

test('niveau gagné : grand cercle, nouveau niveau, Continuer mémorise', async () => {
  saveSeen({ global: 1, guitar: 1, sport: 1 })
  // 1 200 XP guitare + 600 XP sport débloqués → global 1 800 → niveau 2.
  renderWithData(<LevelUpWatcher />, { data: { guitarSessions: [g('2026-10-14', 60, [], 1200)], sportSessions: [ss([], '2026-10-14', 'p1', 600)] } })
  await advance(1300)
  expect(screen.getByRole('dialog', { name: 'Niveau 2 atteint' })).toBeInTheDocument()
  expect(screen.getByText('1')).toBeInTheDocument() // le cercle se remplit encore sur l'ancien niveau
  await advance(1600)
  expect(screen.getByText('Niveau 2 !')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Continuer' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(loadSeen()?.global).toBe(2)
})

test('données pas encore reçues du serveur (instantané local) : ni fête ni recalage', async () => {
  saveSeen({ global: 1, guitar: 1, sport: 1 })
  const data = { guitarSessions: [g('2026-10-14', 60, [], 1200)], sportSessions: [ss([], '2026-10-14', 'p1', 600)] }
  const { unmount } = renderWithData(<LevelUpWatcher />, { fresh: false, data })
  await advance(3000)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(loadSeen()).toEqual({ global: 1, guitar: 1, sport: 1 })
  unmount()
  // Le serveur a répondu : la montée de niveau est fêtée.
  renderWithData(<LevelUpWatcher />, { fresh: true, data })
  await advance(1300)
  expect(screen.getByRole('dialog', { name: 'Niveau 2 atteint' })).toBeInTheDocument()
})

test('premier passage sur instantané : niveaux pas mémorisés', async () => {
  renderWithData(<LevelUpWatcher />, { fresh: false, data: { guitarSessions: [g('2026-10-14', 60, [], 1200)] } })
  await advance(3000)
  expect(loadSeen()).toBeNull()
})

test('pas pendant une saisie de log', async () => {
  saveSeen({ global: 1, guitar: 1, sport: 1 })
  renderWithData(<LevelUpWatcher />, {
    route: '/log/guitare',
    data: { guitarSessions: [g('2026-10-14', 60, [], 1200)], sportSessions: [ss([], '2026-10-14', 'p1', 600)] },
  })
  await advance(3000)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
