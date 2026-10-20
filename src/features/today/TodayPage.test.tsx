import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { addDays } from '../../domain/date'
import { challenge, g, pe, program, set, ss } from '../../test/factories'
import { icon } from '../../test/icon'
import { renderWithData, type RenderWithDataOptions } from '../../test/renderWithData'
import { saveLive } from '../log-sport/liveSession'
import { savePractice, startPractice } from '../practice/practiceSession'
import { TodayPage } from './TodayPage'

const today = '2026-10-15'

function Probe() {
  const loc = useLocation()
  return (
    <p>
      at {loc.pathname} {JSON.stringify(loc.state)}
    </p>
  )
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
    expect(screen.getByText('Nouvelle série')).toBeInTheDocument()
    expect(screen.getByText("30 min aujourd'hui pour lancer ta série")).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: "Minutes de guitare aujourd'hui" })).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByRole('button', { name: 'Niveau 1, voir la progression' })).toBeInTheDocument()
    expect(screen.getByText('Gamme majeure 1 à 66 bpm')).toBeInTheDocument()
    expect(screen.getByText('3 séances de sport dans la même semaine')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Choisir ton programme' }))
    expect(screen.getByText(/at \/bibliotheque/)).toBeInTheDocument()
  })

  test('compte neuf : « Jouer » lance le chrono', async () => {
    renderToday({})
    // Action guitare : couleur et icône de la guitare.
    const play = screen.getByRole('button', { name: 'Jouer · encore 30 min' })
    expect(play).toHaveClass('bg-guitar')
    expect(icon(play, 'play')).toBeInTheDocument()
    await userEvent.click(play)
    expect(screen.getByText('at /jouer {"autostart":true}')).toBeInTheDocument()
  })

  test('hier court (40 min), 35 min aujourd’hui, série de 12 : « Jouer · encore 25 min » (il faut 60)', async () => {
    const past = Array.from({ length: 12 }, (_, i) => g(addDays(today, -(i + 1)), i === 0 ? 40 : 60))
    renderToday({ data: { guitarSessions: [...past, g(today, 35)] } })
    expect(screen.getByText('12 jours')).toBeInTheDocument()
    expect(screen.getByText('Encore 25 min pour tenir la série')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: "Minutes de guitare aujourd'hui" })).toHaveAttribute('aria-valuenow', '35')
    await userEvent.click(screen.getByRole('button', { name: 'Jouer · encore 25 min' }))
    expect(screen.getByText('at /jouer {"autostart":true}')).toBeInTheDocument()
  })

  test('série cassée : le record est rappelé', () => {
    const past = Array.from({ length: 5 }, (_, i) => g(addDays('2026-10-10', -i), 60))
    renderToday({ data: { guitarSessions: past } })
    expect(screen.getByText('Nouvelle série')).toBeInTheDocument()
    expect(screen.getByText("Record : 5 jours · 30 min aujourd'hui pour repartir")).toBeInTheDocument()
  })

  test('60 min aujourd’hui, sans programme : série tenue, journée bouclée', () => {
    renderToday({ data: { guitarSessions: [g(today, 60)] } })
    expect(icon(screen.getByText("Série tenue aujourd'hui"), 'check')).toBeInTheDocument()
    expect(screen.getByText('1 jour')).toBeInTheDocument()
    expect(icon(screen.getByText('Journée bouclée · à demain'), 'check')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Logger sans chrono' })).toBeInTheDocument()
  })

  test('60 min faites et séance de sport due : « Commencer » la prochaine séance', async () => {
    const programs = [program({ id: 'a', name: 'Haut', position: 0 }), program({ id: 'b', name: 'Bas', position: 1 })]
    renderToday({ data: { programs, guitarSessions: [g(today, 60)], sportSessions: [ss([], '2026-10-14', 'a')] } })
    // Action sport en haut de l'accueil : couleur du sport (la carte Sport a aussi son bouton « Commencer Bas »).
    const start = within(screen.getByRole('region', { name: 'Série' })).getByRole('button', { name: 'Commencer Bas' })
    expect(start).toHaveClass('bg-sport')
    await userEvent.click(start)
    expect(screen.getByText('at /log/sport {"programId":"b"}')).toBeInTheDocument()
  })

  test('guitare et sport faits aujourd’hui : journée bouclée', () => {
    const programs = [program({ id: 'a', name: 'Haut', position: 0 }), program({ id: 'b', name: 'Bas', position: 1 })]
    renderToday({ data: { programs, guitarSessions: [g(today, 60)], sportSessions: [ss([], today, 'a')] } })
    expect(screen.getByText(/Journée bouclée/)).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Série' })).queryByRole('button')).not.toBeInTheDocument()
  })

  test('chrono guitare en cours : le reprendre', async () => {
    savePractice(startPractice(new Date(Date.now() - 12 * 60_000), 'p'))
    renderToday({ data: { guitarSessions: [g(today, 60)] } })
    expect(screen.queryByRole('button', { name: 'Rejouer avec le chrono' })).not.toBeInTheDocument()
    const resume = screen.getByRole('button', { name: 'Reprendre la guitare · 12 min' })
    expect(icon(resume, 'timer')).toBeInTheDocument()
    await userEvent.click(resume)
    expect(screen.getByText('at /jouer null')).toBeInTheDocument()
  })

  test('chrono guitare oublié depuis plus de 12 h : pas proposé', () => {
    savePractice(startPractice(new Date(Date.now() - 13 * 3_600_000), 'p'))
    renderToday({})
    expect(screen.getByRole('button', { name: 'Jouer · encore 30 min' })).toBeInTheDocument()
  })

  test('sport : semaine, séance du jour détaillée, suivante', async () => {
    const bench = pe({ id: 'bench', programId: 'b', name: 'Squat', targetSets: 4, targetReps: 8 })
    const programs = [program({ id: 'a', name: 'Haut', position: 0 }), program({ id: 'b', name: 'Bas', position: 1, exercises: [bench] })]
    renderToday({ data: { programs, sportSessions: [ss([set(80, 8, 'bench')], '2026-10-12', 'b'), ss([], '2026-10-14', 'a')] } })
    expect(within(screen.getByRole('region', { name: 'Cette semaine' })).getByText('2/3')).toBeInTheDocument()
    expect(screen.getByText(/Encore 1 séance cette semaine/)).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: 'L : Bas' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Sport' })).getByText('Séance du jour')).toBeInTheDocument()
    expect(screen.getByText('4×8 · 80 kg')).toBeInTheDocument()
    expect(screen.getByText('Ensuite : Haut')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Commencer Bas' }))
    expect(screen.getByText(/at \/log\/sport/)).toBeInTheDocument()
  })

  test('sport : 3 séances faites, semaine validée', () => {
    const p = program({ id: 'a', name: 'Haut' })
    renderToday({ data: { programs: [p], sportSessions: ['2026-10-12', '2026-10-13', '2026-10-14'].map((d) => ss([], d, 'a')) } })
    expect(icon(screen.getByText(/Semaine validée/), 'check')).toBeInTheDocument()
  })

  test('niveau guitare bloqué : défi requis, réserve, relance', async () => {
    const blocked = challenge({ id: 'cg', target: { kind: 'bpm', exerciseId: 'legato-4', bpm: 84, baseline: 80 }, blockedSince: '2026-10-10' })
    const { actions } = renderToday({ data: { guitarSessions: [g('2026-10-14', 60, [], 1540)], challenges: [blocked, lvl1[1]] } })
    expect(screen.getByText('Bloquant')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Legato 4 à 84 bpm/ }))
    expect(screen.queryByRole('button', { name: 'Défi plus facile' })).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: /^Relancer/ })[0])
    expect(actions.rerollChallenge).toHaveBeenCalledWith('cg')
  })

  test('bloqué depuis 14 jours : version plus facile proposée', async () => {
    const blocked = challenge({ id: 'cg', target: { kind: 'bpm', exerciseId: 'legato-4', bpm: 96, baseline: 80 }, blockedSince: '2026-10-01' })
    const { actions } = renderToday({ data: { guitarSessions: [g('2026-10-14', 60, [], 1300)], challenges: [blocked] } })
    await userEvent.click(screen.getByRole('button', { name: /Legato 4 à 96 bpm/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Défi plus facile' }))
    expect(actions.acceptEasier).toHaveBeenCalledWith('cg')
  })

  test('relances épuisées : bouton absent', () => {
    renderToday({ data: { challenges: [challenge({ rerolls: 2 })] } })
    expect(screen.queryByRole('button', { name: /^Relancer/ })).not.toBeInTheDocument()
  })

  test('cercle de niveau : ouvre le détail, se ferme', async () => {
    const blocked = challenge({ id: 'cg', target: { kind: 'bpm', exerciseId: 'legato-4', bpm: 84, baseline: 80 }, blockedSince: '2026-10-10' })
    renderToday({ data: { guitarSessions: [g('2026-10-14', 60, [], 1540)], challenges: [blocked] } })
    await userEvent.click(screen.getByRole('button', { name: 'Niveau 1, voir la progression' }))
    const sheet = screen.getByRole('dialog', { name: 'Progression' })
    expect(within(sheet).getByText('Défi requis pour passer au niveau 2')).toBeInTheDocument()
    expect(within(sheet).getByText('+340 XP en réserve')).toBeInTheDocument()
    expect(within(sheet).getByText('1200 / 1200 XP')).toBeInTheDocument()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Fermer' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  test('séance de sport en cours : exos, séries faites, exo courant, reprendre', async () => {
    const a = pe({ id: 'a', programId: 'p', name: 'Squat', targetSets: 3, position: 0 })
    const b = pe({ id: 'b', programId: 'p', name: 'Fentes', targetSets: 3, position: 1 })
    saveLive({
      id: 'live',
      programId: 'p',
      startedAt: new Date().toISOString(),
      exerciseIndex: 1,
      exerciseId: 'b',
      weightKg: 20,
      reps: 10,
      sets: [set(80, 8, 'a', 1), set(80, 8, 'a', 2), set(80, 8, 'a', 3), set(20, 10, 'b', 1)],
    })
    renderToday({ data: { programs: [program({ id: 'p', name: 'Bas', exercises: [a, b] })] } })
    const list = screen.getByRole('list', { name: 'Exos de la séance en cours' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(['Squat3/3 séries', 'Fentes1/3 séries'])
    expect(icon(items[0], 'check')).toBeInTheDocument()
    expect(icon(items[1], 'chevron')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reprendre la séance' }))
    expect(screen.getByText(/at \/log\/sport/)).toBeInTheDocument()
    saveLive(null)
  })

  test('séance de sport en cours : prioritaire sur la guitare en haut de l’accueil', async () => {
    saveLive({ id: 'live', programId: 'p', startedAt: new Date().toISOString(), exerciseIndex: 0, exerciseId: null, weightKg: 20, reps: 10, sets: [] })
    savePractice(startPractice(new Date(), 'g'))
    renderToday({ data: { programs: [program({ id: 'p', name: 'Bas', exercises: [pe({ id: 'a', programId: 'p' })] })] } })
    expect(screen.queryByRole('button', { name: /Reprendre la guitare/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reprendre Bas' }))
    expect(screen.getByText('at /log/sport null')).toBeInTheDocument()
    saveLive(null)
  })

  test('ordre : la semaine en haut, puis les séances, les morceaux à entretenir (14 j), les défis', () => {
    const songs = [
      { id: 'm1', title: 'Wonderwall', artist: '', status: 'maintain' as const, masteredOn: '2026-09-01' },
      { id: 'm2', title: 'Zombie', artist: '', status: 'maintain' as const, masteredOn: '2026-10-10' },
    ]
    renderToday({ data: { challenges: [challenge({ status: 'active', level: 1 })] }, v1: { songs } })
    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    const at = (t: string) => titles.findIndex((x) => x?.includes(t))
    expect(at('Cette semaine')).toBe(0)
    expect(at('Guitare')).toBeLessThan(at('À entretenir'))
    expect(at('À entretenir')).toBeLessThan(at('Défis en cours'))
    const maintain = screen.getByRole('region', { name: 'À entretenir' })
    expect(within(maintain).getByText('Wonderwall')).toBeInTheDocument()
    expect(within(maintain).getByText('Pas joué depuis 44 jours')).toBeInTheDocument()
    // Maîtrisé il y a 5 jours : pas encore.
    expect(within(maintain).queryByText('Zombie')).not.toBeInTheDocument()
  })
})
