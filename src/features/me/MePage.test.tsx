import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { challenge, g } from '../../test/factories'
import { EMPTY_PROFILE } from '../../domain/model'
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
  test('sans cycle : objectifs proposés (un objectif ouvert est repris), « Lancer le cycle »', async () => {
    const { actions } = renderMe({ data: { challenges: lvl1 } })
    expect(screen.getByRole('button', { name: 'Niveau 1, voir la progression' })).toHaveTextContent('Niveau 1')
    const hero = screen.getByRole('region', { name: 'Lance ton prochain cycle' })
    expect(within(hero).getByText('Gamme majeure 1 à 66 bpm')).toBeInTheDocument()
    expect(within(hero).getByText('3 séances de sport dans la même semaine')).toBeInTheDocument()
    await userEvent.click(within(hero).getByRole('button', { name: 'Lancer le cycle' }))
    expect(actions.startCycle).toHaveBeenCalledWith({ guitar: lvl1[0].target, sport: lvl1[1].target })
  })

  test('cycle en cours : semaine et objectifs avec leur progression', () => {
    renderMe({ data: { challenges: lvl1 }, v1: { profile: { ...EMPTY_PROFILE, cycles: [{ start: '2026-10-05', guitar: 'cg', sport: 'cs' }] } } })
    const hero = screen.getByRole('region', { name: 'Semaine 2 sur 6' })
    expect(within(hero).getByText('S2/6')).toBeInTheDocument()
    expect(within(hero).getByText('Gamme majeure 1 à 66 bpm')).toBeInTheDocument()
  })

  test('cycle fini : bilan (avant / après, records, ce que je garde), puis cycle suivant', async () => {
    const done = { ...lvl1[0], status: 'done' as const, doneOn: '2026-08-20' }
    const { actions } = renderMe({
      data: { challenges: [done, lvl1[1]] },
      v1: { profile: { ...EMPTY_PROFILE, cycles: [{ start: '2026-08-10', guitar: 'cg', sport: 'cs' }] } },
    })
    const hero = screen.getByRole('region', { name: '6 semaines, le bilan' })
    expect(within(hero).getByText(/atteint/)).toBeInTheDocument()
    await userEvent.type(within(hero).getByRole('textbox', { name: 'Ce que je garde' }), 'Jouer le matin')
    await userEvent.click(within(hero).getByRole('button', { name: 'Lancer le cycle suivant' }))
    expect(actions.saveCycleReview).toHaveBeenCalledWith('Jouer le matin')
    expect(actions.startCycle).toHaveBeenCalled()
  })

  test('outils', () => {
    renderMe({})
    expect(screen.getByRole('link', { name: /Bibliothèque/ })).toHaveAttribute('href', '/bibliotheque')
    expect(screen.getByRole('link', { name: /Sauvegarde et réglages/ })).toHaveAttribute('href', '/moi/reglages')
    expect(screen.getByRole('button', { name: /Préparer une course/ })).toBeInTheDocument()
  })

  test('objectif ouvert depuis 14 jours : version plus facile proposée', async () => {
    const old = challenge({ id: 'cg', target: { kind: 'bpm', exerciseId: 'legato-4', bpm: 96, baseline: 80 }, blockedSince: '2026-10-01' })
    const { actions } = renderMe({
      data: { challenges: [old] },
      v1: { profile: { ...EMPTY_PROFILE, cycles: [{ start: '2026-10-05', guitar: 'cg', sport: null }] } },
    })
    await userEvent.click(screen.getByRole('button', { name: /Legato 4 à 96 bpm/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Objectif plus facile' }))
    expect(actions.acceptEasier).toHaveBeenCalledWith('cg')
  })

  test('relances épuisées : bouton absent', () => {
    renderMe({
      data: { challenges: [challenge({ id: 'r', rerolls: 2 })] },
      v1: { profile: { ...EMPTY_PROFILE, cycles: [{ start: '2026-10-05', guitar: 'r', sport: null }] } },
    })
    expect(screen.queryByRole('button', { name: /^Changer d'objectif/ })).not.toBeInTheDocument()
  })

  test('cercle de niveau : ouvre le détail, se ferme', async () => {
    renderMe({ data: { guitarSessions: [g('2026-10-14', 60, [], 640)] } })
    await userEvent.click(screen.getByRole('button', { name: 'Niveau 1, voir la progression' }))
    const sheet = screen.getByRole('dialog', { name: 'Progression' })
    expect(within(sheet).getByText('40 / 600 XP')).toBeInTheDocument()
    expect(within(sheet).getByText(/L'XP récompense ta progression/)).toBeInTheDocument()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Fermer' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
