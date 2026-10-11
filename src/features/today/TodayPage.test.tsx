import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { addDays } from '../../domain/date'
import { challenge, g, program, ss } from '../../test/factories'
import { renderWithData, type RenderWithDataOptions } from '../../test/renderWithData'
import { TodayPage } from './TodayPage'

const today = '2026-10-15'

function Probe() {
  const loc = useLocation()
  return <p>at {loc.pathname} {JSON.stringify(loc.state)}</p>
}

const renderToday = (opts: RenderWithDataOptions) =>
  renderWithData(
    <Routes>
      <Route path="/" element={<TodayPage />} />
      <Route path="*" element={<Probe />} />
    </Routes>,
    { today, ...opts },
  )

const lvl1 = [
  challenge({ id: 'cg', domain: 'guitar', target: { kind: 'bpm', exerciseId: 'scales-1', bpm: 66, baseline: null } }),
  challenge({ id: 'cs', domain: 'sport', target: { kind: 'sessionsInWeek', count: 3 } }),
]

describe('TodayPage', () => {
  test('compte neuf', async () => {
    renderToday({ data: { challenges: lvl1 } })
    expect(screen.getByText('0 jour')).toBeInTheDocument()
    expect(screen.getByText('Encore 60 min de guitare pour tenir la série')).toBeInTheDocument()
    expect(screen.getByText('Niveau 1')).toBeInTheDocument()
    expect(screen.getByText('Gamme majeure 1 à 66 bpm')).toBeInTheDocument()
    expect(screen.getByText('3 séances de sport dans la même semaine')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Créer ton programme' }))
    expect(screen.getByText(/at \/reglages/)).toBeInTheDocument()
  })

  test('35 min aujourd’hui et série de 12 : bouton « Logger 25 min »', async () => {
    const past = Array.from({ length: 12 }, (_, i) => g(addDays(today, -(i + 1)), 60))
    renderToday({ data: { guitarSessions: [...past, g(today, 35)] } })
    expect(screen.getByText('12 jours')).toBeInTheDocument()
    expect(screen.getByText('Encore 25 min de guitare pour tenir la série')).toBeInTheDocument()
    expect(screen.getByText('35/60')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Logger 25 min' }))
    expect(screen.getByText('at /log/guitare {"durationMin":25}')).toBeInTheDocument()
  })

  test('60 min aujourd’hui : série tenue', () => {
    renderToday({ data: { guitarSessions: [g(today, 60)] } })
    expect(screen.getByText("Série tenue aujourd'hui ✓")).toBeInTheDocument()
    expect(screen.getByText('1 jour')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Logger une session' })).toBeInTheDocument()
  })

  test('sport : 2/3 cette semaine et prochaine séance du programme', async () => {
    const programs = [program({ id: 'a', name: 'Haut', position: 0 }), program({ id: 'b', name: 'Bas', position: 1 })]
    renderToday({ data: { programs, sportSessions: [ss([], '2026-10-12', 'b'), ss([], '2026-10-14', 'a')] } })
    expect(screen.getByText('2/3')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '+ Séance Bas' }))
    expect(screen.getByText(/at \/log\/sport/)).toBeInTheDocument()
  })

  test('niveau guitare bloqué : défi requis, réserve, relance', async () => {
    const blocked = challenge({ id: 'cg', target: { kind: 'bpm', exerciseId: 'legato-4', bpm: 84, baseline: 80 }, blockedSince: '2026-10-10' })
    const { actions } = renderToday({ data: { guitarSessions: [g('2026-10-14', 60, [], 1540)], challenges: [blocked, lvl1[1]] } })
    expect(screen.getByText('Défi requis')).toBeInTheDocument()
    expect(screen.getByText('+340 XP en réserve')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Défi plus facile' })).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Relancer' })[0])
    expect(actions.rerollChallenge).toHaveBeenCalledWith('cg')
  })

  test('bloqué depuis 14 jours : version plus facile proposée', async () => {
    const blocked = challenge({ id: 'cg', target: { kind: 'bpm', exerciseId: 'legato-4', bpm: 84, baseline: 80 }, blockedSince: '2026-10-01' })
    const { actions } = renderToday({ data: { guitarSessions: [g('2026-10-14', 60, [], 1300)], challenges: [blocked] } })
    await userEvent.click(screen.getByRole('button', { name: 'Défi plus facile' }))
    expect(actions.acceptEasier).toHaveBeenCalledWith('cg')
  })

  test('relances épuisées : bouton absent', () => {
    renderToday({ data: { challenges: [challenge({ rerolls: 2 })] } })
    expect(screen.queryByRole('button', { name: 'Relancer' })).not.toBeInTheDocument()
  })
})
