import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { challenge, ex, g } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { ChallengeCard } from './ChallengeCard'

const today = '2026-10-15'
const ch = challenge({ id: 'cg', createdOn: '2026-10-10', blockedSince: '2026-10-11', target: { kind: 'bpm', exerciseId: 'legato-4', bpm: 90, baseline: 80 } })

test('objectif : compact (cible et jauge), puis détails au toucher', async () => {
  const { actions } = renderWithData(<ChallengeCard challenge={ch} />, { today, data: { guitarSessions: [g('2026-10-12', 60, [ex('legato-4', 84)])] } })
  expect(screen.getByText('Legato 4 à 90 bpm')).toBeInTheDocument()
  expect(screen.getByText('84 / 90 bpm')).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: "S'entraîner →" })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /Legato 4 à 90 bpm/ }))
  expect(screen.getByRole('link', { name: "S'entraîner →" })).toHaveAttribute('href', '/exo/legato-4')
  await userEvent.click(screen.getByRole('button', { name: "Changer d'objectif (2 restants)" }))
  expect(actions.rerollChallenge).toHaveBeenCalledWith('cg')
})

test('sortie longue : progression en km depuis le début de l’objectif', () => {
  vi.useRealTimers()
  const run = challenge({ id: 'run', domain: 'sport', createdOn: '2026-10-01', target: { kind: 'longRun', km: 16 } })
  renderWithData(<ChallengeCard challenge={run} />, { today })
  expect(screen.getByText('Sortie longue de 16 km')).toBeInTheDocument()
  expect(screen.getByText('0 / 16 km')).toBeInTheDocument()
})
