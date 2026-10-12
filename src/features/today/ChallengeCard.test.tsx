import { screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { domainLevel } from '../../domain/levels'
import { challenge, ex, g } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { ChallengeCard } from './ChallengeCard'

const today = '2026-10-15'
const ch = challenge({ id: 'cg', createdOn: '2026-10-10', blockedSince: '2026-10-11', target: { kind: 'bpm', exerciseId: 'legato-4', bpm: 90, baseline: 80 } })

test('bloquant : progression, message, réserve, s’entraîner vers la fiche de l’exo', () => {
  const sessions = [g('2026-10-12', 60, [ex('legato-4', 84)], 1540)]
  renderWithData(<ChallengeCard challenge={ch} level={domainLevel('guitar', 1540, [ch])} />, { today, data: { guitarSessions: sessions } })
  expect(screen.getByText('Legato 4 à 90 bpm')).toBeInTheDocument()
  expect(screen.getByText('84 / 90 bpm')).toBeInTheDocument()
  expect(screen.getByText(/Défi requis : ta jauge est pleine/)).toBeInTheDocument()
  expect(screen.getByText(/\+340 XP en réserve, versés dès la réussite · bloqué depuis 4 j/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: "S'entraîner →" })).toHaveAttribute('href', '/exo/legato-4')
  expect(screen.getByRole('button', { name: 'Relancer (2 restantes)' })).toBeInTheDocument()
})

test('non bloquant : XP restants avant le seuil', () => {
  renderWithData(<ChallengeCard challenge={ch} level={domainLevel('guitar', 1000, [ch])} />, { today })
  expect(screen.getByText('0 / 90 bpm')).toBeInTheDocument()
  expect(screen.getByText('Réussis-le avant les 200 XP restants du niveau pour passer sans attendre.')).toBeInTheDocument()
})
