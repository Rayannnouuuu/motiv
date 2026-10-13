import { act, fireEvent, screen } from '@testing-library/react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { dailyPlan } from '../../domain/dailyPlan'
import { ex, g, mkSong } from '../../test/factories'
import { renderWithData, type RenderWithDataOptions } from '../../test/renderWithData'
import { PracticePage } from './PracticePage'
import { loadPractice, savePractice, startPractice } from './practiceSession'

const today = '2026-10-15'
const T0 = new Date('2026-10-15T16:00:00Z') // 18 h à Paris

function Probe() {
  const loc = useLocation()
  return <p>at {loc.pathname} {JSON.stringify(loc.state)}</p>
}

/** État de navigation de l'écran du chrono lui-même. */
function NavState() {
  return <output data-testid="nav-state">{JSON.stringify(useLocation().state)}</output>
}

const renderPractice = (opts: RenderWithDataOptions = {}) =>
  renderWithData(
    <>
      <Routes>
        <Route
          path="/jouer"
          element={
            <>
              <PracticePage />
              <NavState />
            </>
          }
        />
        <Route path="*" element={<Probe />} />
      </Routes>
    </>,
    { today, route: { pathname: '/jouer', state: { autostart: true } }, ...opts },
  )

const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms))
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
/** État transmis à la page d'arrivée (Probe). */
const landedState = (path: string) => {
  const text = screen.getByText(new RegExp(`^at ${path.replace(/\//g, '\\/')} `)).textContent!
  return JSON.parse(text.slice(`at ${path} `.length))
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(T0)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('PracticePage', () => {
  test('autostart : le chrono part de 0:00 et tourne ; un retour arrière ne le relance pas', () => {
    renderPractice()
    expect(screen.getByRole('timer')).toHaveTextContent('0:00')
    expect(screen.getByTestId('nav-state')).toHaveTextContent('null')
    tick(65_000)
    expect(screen.getByRole('timer')).toHaveTextContent('1:05')
    expect(loadPractice()).toMatchObject({ startedAt: T0.toISOString(), pausedAt: null })
  })

  test('sans séance ni autostart : bouton Démarrer', () => {
    renderPractice({ route: '/jouer' })
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    click('▶︎ Démarrer')
    expect(screen.getByRole('timer')).toHaveTextContent('0:00')
    expect(loadPractice()).not.toBeNull()
  })

  test('Pause fige le chrono, Reprendre le relance', () => {
    renderPractice()
    tick(10_000)
    click('Pause')
    tick(30_000)
    expect(screen.getByRole('timer')).toHaveTextContent('0:10')
    expect(screen.getByText('En pause')).toBeInTheDocument()
    click('Reprendre')
    tick(5_000)
    expect(screen.getByRole('timer')).toHaveTextContent('0:15')
  })

  test('un exo coché est enregistré dans la séance', () => {
    renderPractice()
    const [first] = dailyPlan({ guitarSessions: [], challenges: [] }, today)
    const box = screen.getByRole('button', { name: `Fait : ${first.title}` })
    expect(box).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(box)
    expect(box).toHaveAttribute('aria-pressed', 'true')
    expect(loadPractice()?.exercises).toEqual([first.id])
    expect(screen.getByRole('link', { name: `Tablature : ${first.title}` })).toHaveAttribute('href', `/exo/${first.id}`)
  })

  test('Terminer : log pré-rempli (durée, exos et morceaux cochés, jour, id de séance), à l’étape des notes', () => {
    const [first] = dailyPlan({ guitarSessions: [], challenges: [] }, today)
    const songs = [mkSong({ id: 'song-p', title: 'Paranoid' })]
    renderPractice({ data: { songs, guitarSessions: [g(today, 10, [ex(first.id, 72)])] } })
    expect(screen.getByText(`Cible ${first.targetBpm} bpm · record 72`)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: `Fait : ${first.title}` }))
    click('🎵 Paranoid')
    tick(25 * 60_000 + 20_000)
    const id = loadPractice()!.id
    click('Terminer')
    expect(landedState('/log/guitare')).toEqual({
      durationMin: 25,
      step: 2,
      entries: [
        { kind: 'exercise', exerciseId: first.id, bpm: '72' },
        { kind: 'song', songId: 'song-p', mastered: false },
      ],
      day: today,
      practiceId: id,
    })
    // La séance reste en pause tant que le log n'est pas enregistré.
    expect(loadPractice()).toMatchObject({ id, pausedAt: new Date(T0.getTime() + 25 * 60_000 + 20_000).toISOString() })
  })

  test('Abandonner (confirmé) efface la séance et revient à l’accueil', () => {
    renderPractice()
    tick(3_000)
    click('Abandonner')
    click("Oui, abandonner (rien n'est enregistré)")
    expect(loadPractice()).toBeNull()
    expect(screen.getByText(/^at \/ /)).toBeInTheDocument()
  })

  test('50 min déjà loggées + 10 min de chrono : série tenue, fête mémorisée', () => {
    renderPractice({ data: { guitarSessions: [g(today, 50)] } })
    expect(screen.getByText("50/60 min aujourd'hui")).toBeInTheDocument()
    tick(9 * 60_000)
    expect(screen.getByText("59/60 min aujourd'hui")).toBeInTheDocument()
    tick(60_000)
    expect(screen.getByText('Série tenue ✓')).toBeInTheDocument()
    expect(loadPractice()?.goalCelebrated).toBe(true)
  })

  test('séance de plus de 12 h : logger sans durée ou abandonner', () => {
    // Commencée la veille au soir : le log est daté de la veille.
    const old = { ...startPractice(new Date('2026-10-14T19:00:00Z'), 'old'), exercises: ['scales-1'] }
    savePractice(old)
    renderPractice({ route: '/jouer' })
    expect(screen.getByText("Une séance commencée il y a plus de 12 h n'a pas été terminée.")).toBeInTheDocument()
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    click('Logger sans durée')
    expect(landedState('/log/guitare')).toEqual({
      durationMin: null, // « sans durée » : rien de présélectionné dans le log
      entries: [{ kind: 'exercise', exerciseId: 'scales-1', bpm: '' }],
      day: '2026-10-14',
      practiceId: 'old',
    })
  })

  test('appli reprise par iOS après plus de 12 h sur le chrono : la question revient au lieu d’enregistrer 10 h', () => {
    renderPractice()
    expect(screen.getByRole('timer')).toHaveTextContent('0:00')
    // Téléphone verrouillé : la page reste montée mais ne tique plus ; elle revient 14 h plus tard.
    act(() => {
      vi.setSystemTime(new Date(T0.getTime() + 14 * 3_600_000))
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(screen.getByText("Une séance commencée il y a plus de 12 h n'a pas été terminée.")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Terminer' })).not.toBeInTheDocument()
  })

  test('séance restée en pause plus de 12 h : ses minutes mesurées sont gardées', () => {
    // 30 min jouées de 8 h à 8 h 30 (Paris), puis pause ; retour à 20 h 30.
    const start = new Date('2026-10-15T06:00:00Z')
    const paused = { ...startPractice(start, 'p'), pausedAt: new Date(start.getTime() + 30 * 60_000).toISOString() }
    savePractice(paused)
    vi.setSystemTime(new Date('2026-10-15T18:30:00Z'))
    renderPractice({ route: '/jouer' })
    expect(screen.getByText("Une séance restée en pause n'a pas été enregistrée : 30 min jouées.")).toBeInTheDocument()
    click('Logger 30 min')
    expect(landedState('/log/guitare')).toMatchObject({ durationMin: 30, day: '2026-10-15', practiceId: 'p' })
  })

  test('en pause depuis la veille : pas de Reprendre (le jeu du jour irait sur hier), seulement Terminer', () => {
    // 15 min de 23 h 30 à 23 h 45 (Paris) le 15, puis pause ; il est 7 h 30 le 16 (moins de 12 h).
    const start = new Date('2026-10-15T21:30:00Z')
    savePractice({ ...startPractice(start, 'y'), pausedAt: new Date(start.getTime() + 15 * 60_000).toISOString() })
    vi.setSystemTime(new Date('2026-10-16T05:30:00Z'))
    renderPractice({ today: '2026-10-16', route: '/jouer' })
    expect(screen.queryByRole('button', { name: 'Reprendre' })).not.toBeInTheDocument()
    expect(screen.getByText(/Commencée hier/)).toBeInTheDocument()
    click('Terminer')
    expect(landedState('/log/guitare')).toMatchObject({ durationMin: 15, day: '2026-10-15', practiceId: 'y', step: 2 })
  })

  test('chrono qui passe minuit : l’anneau compte les minutes du jour de départ', () => {
    // 30 min déjà loggées le 15 ; départ à 23:40 (Paris) ; il est maintenant 00:10 le 16.
    const start = new Date('2026-10-15T21:40:00Z')
    savePractice(startPractice(start, 'late'))
    vi.setSystemTime(new Date('2026-10-15T22:10:00Z'))
    renderPractice({ today: '2026-10-16', route: '/jouer', data: { guitarSessions: [g('2026-10-15', 30)] } })
    expect(screen.getByText('Série tenue ✓')).toBeInTheDocument() // 30 + 30 sur le 15
  })
})
