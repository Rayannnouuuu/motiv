import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { challenge, g } from '../../test/factories'
import { renderWithData, type RenderWithDataOptions } from '../../test/renderWithData'
import { MePage } from './MePage'

const today = '2026-10-15'

const renderMe = (opts: RenderWithDataOptions) =>
  renderWithData(
    <Routes>
      <Route path="/" element={<MePage />} />
      <Route path="*" element={<p>ailleurs</p>} />
    </Routes>,
    { today, ...opts },
  )

const lvl1 = [
  challenge({ id: 'cg', domain: 'guitar', target: { kind: 'bpm', exerciseId: 'scales-1', bpm: 66, baseline: null } }),
  challenge({ id: 'cs', domain: 'sport', target: { kind: 'sessionsInWeek', count: 3 } }),
]

describe('MePage', () => {
  test('compte neuf : niveau 1, défis en cours, outils', () => {
    renderMe({ data: { challenges: lvl1 } })
    expect(screen.getByRole('button', { name: 'Niveau 1, voir la progression' })).toHaveTextContent('Niveau 1')
    expect(screen.getByText('Gamme majeure 1 à 66 bpm')).toBeInTheDocument()
    expect(screen.getByText('3 séances de sport dans la même semaine')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Bibliothèque/ })).toHaveAttribute('href', '/bibliotheque')
    expect(screen.getByRole('link', { name: /Sauvegarde et réglages/ })).toHaveAttribute('href', '/moi/reglages')
    expect(screen.getByRole('button', { name: /Préparer une course/ })).toBeInTheDocument()
  })

  test('niveau guitare bloqué : défi requis, réserve, relance', async () => {
    const blocked = challenge({ id: 'cg', target: { kind: 'bpm', exerciseId: 'legato-4', bpm: 84, baseline: 80 }, blockedSince: '2026-10-10' })
    const { actions } = renderMe({ data: { guitarSessions: [g('2026-10-14', 60, [], 1540)], challenges: [blocked, lvl1[1]] } })
    expect(screen.getByText('Bloquant')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Legato 4 à 84 bpm/ }))
    expect(screen.queryByRole('button', { name: 'Défi plus facile' })).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: /^Relancer/ })[0])
    expect(actions.rerollChallenge).toHaveBeenCalledWith('cg')
  })

  test('bloqué depuis 14 jours : version plus facile proposée', async () => {
    const blocked = challenge({ id: 'cg', target: { kind: 'bpm', exerciseId: 'legato-4', bpm: 96, baseline: 80 }, blockedSince: '2026-10-01' })
    const { actions } = renderMe({ data: { guitarSessions: [g('2026-10-14', 60, [], 1300)], challenges: [blocked] } })
    await userEvent.click(screen.getByRole('button', { name: /Legato 4 à 96 bpm/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Défi plus facile' }))
    expect(actions.acceptEasier).toHaveBeenCalledWith('cg')
  })

  test('relances épuisées : bouton absent', () => {
    renderMe({ data: { challenges: [challenge({ rerolls: 2 })] } })
    expect(screen.queryByRole('button', { name: /^Relancer/ })).not.toBeInTheDocument()
  })

  test('cercle de niveau : ouvre le détail, se ferme', async () => {
    const blocked = challenge({ id: 'cg', target: { kind: 'bpm', exerciseId: 'legato-4', bpm: 84, baseline: 80 }, blockedSince: '2026-10-10' })
    renderMe({ data: { guitarSessions: [g('2026-10-14', 60, [], 1540)], challenges: [blocked] } })
    await userEvent.click(screen.getByRole('button', { name: 'Niveau 1, voir la progression' }))
    const sheet = screen.getByRole('dialog', { name: 'Progression' })
    expect(within(sheet).getByText('Défi requis pour passer au niveau 2')).toBeInTheDocument()
    expect(within(sheet).getByText('+340 XP en réserve')).toBeInTheDocument()
    expect(within(sheet).getByText('1200 / 1200 XP')).toBeInTheDocument()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Fermer' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
