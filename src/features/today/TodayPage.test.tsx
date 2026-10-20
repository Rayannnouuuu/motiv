import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { addDays } from '../../domain/date'
import { g, pe, program, set, ss } from '../../test/factories'
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

const hero = () => screen.getByRole('region', { name: (_, el) => el.tagName === 'SECTION' && el.getAttribute('aria-labelledby') === 'next-title' })

describe('TodayPage', () => {
  test('compte neuf : la guitare en héros, « Commencer » lance le chrono', async () => {
    renderToday({})
    expect(within(hero()).getByText('Prochaine séance · Guitare')).toBeInTheDocument()
    expect(within(hero()).getByText("30 min aujourd'hui pour lancer ta série")).toBeInTheDocument()
    expect(within(hero()).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3)
    const start = within(hero()).getByRole('button', { name: 'Commencer' })
    expect(start).toHaveClass('bg-guitar')
    expect(icon(start, 'play')).toBeInTheDocument()
    await userEvent.click(start)
    expect(screen.getByText('at /jouer {"autostart":true}')).toBeInTheDocument()
  })

  test('compte neuf : sans programme, la tuile sport propose d’en choisir un', async () => {
    renderToday({})
    await userEvent.click(screen.getByRole('link', { name: 'Choisir ton programme' }))
    expect(screen.getByText(/at \/bibliotheque/)).toBeInTheDocument()
  })

  test('hier court (40 min), 35 min aujourd’hui, série de 12 : pastille et minutes qui manquent', () => {
    const past = Array.from({ length: 12 }, (_, i) => g(addDays(today, -(i + 1)), i === 0 ? 40 : 60))
    renderToday({ data: { guitarSessions: [...past, g(today, 35)] } })
    expect(screen.getByText("12 jours d'affilée")).toBeInTheDocument()
    expect(within(hero()).getByText('Encore 25 min pour tenir la série de 12 jours')).toBeInTheDocument()
  })

  test('série cassée : le record est rappelé', () => {
    const past = Array.from({ length: 5 }, (_, i) => g(addDays('2026-10-10', -i), 60))
    renderToday({ data: { guitarSessions: past } })
    expect(within(hero()).getByText('Encore 30 min · record : 5 jours')).toBeInTheDocument()
  })

  test('60 min aujourd’hui, sans programme : journée bouclée, rejouer reste possible', async () => {
    renderToday({ data: { guitarSessions: [g(today, 60)] } })
    expect(within(hero()).getByRole('heading', { name: 'Tout est fait' })).toBeInTheDocument()
    await userEvent.click(within(hero()).getByRole('button', { name: 'Rejouer avec le chrono' }))
    expect(screen.getByText('at /jouer {"autostart":true}')).toBeInTheDocument()
  })

  test('guitare faite, séance de sport due : le sport en héros, exos et charges de la dernière fois', async () => {
    const squat = pe({ id: 'squat', programId: 'b', name: 'Squat', targetSets: 4, targetReps: 8 })
    const programs = [program({ id: 'a', name: 'Haut', position: 0 }), program({ id: 'b', name: 'Bas', position: 1, exercises: [squat] })]
    renderToday({
      data: { programs, guitarSessions: [g(today, 60)], sportSessions: [ss([set(80, 8, 'squat')], '2026-10-12', 'b'), ss([], '2026-10-14', 'a')] },
    })
    expect(within(hero()).getByText('Prochaine séance · Sport')).toBeInTheDocument()
    expect(within(hero()).getByRole('heading', { name: 'Bas' })).toBeInTheDocument()
    expect(within(hero()).getByText('4×8 · 80 kg')).toBeInTheDocument()
    const start = within(hero()).getByRole('button', { name: 'Commencer' })
    expect(start).toHaveClass('bg-sport')
    await userEvent.click(start)
    expect(screen.getByText('at /log/sport {"programId":"b"}')).toBeInTheDocument()
  })

  test('guitare à jouer et sport dû : le sport dans « Aussi aujourd’hui »', async () => {
    const programs = [program({ id: 'a', name: 'Haut', position: 0 })]
    renderToday({ data: { programs } })
    const also = screen.getByRole('region', { name: "Aussi aujourd'hui" })
    await userEvent.click(within(also).getByRole('button', { name: /^Sport · Haut/ }))
    expect(screen.getByText('at /log/sport {"programId":"a"}')).toBeInTheDocument()
  })

  test('guitare et sport faits aujourd’hui : journée bouclée', () => {
    const programs = [program({ id: 'a', name: 'Haut', position: 0 }), program({ id: 'b', name: 'Bas', position: 1 })]
    renderToday({ data: { programs, guitarSessions: [g(today, 60)], sportSessions: [ss([], today, 'a')] } })
    expect(within(hero()).getByText('Journée bouclée')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: "Aussi aujourd'hui" })).not.toBeInTheDocument()
  })

  test('chrono guitare en cours : le reprendre', async () => {
    savePractice(startPractice(new Date(Date.now() - 12 * 60_000), 'p'))
    renderToday({ data: { guitarSessions: [g(today, 60)] } })
    expect(within(hero()).getByText('En cours · Guitare')).toBeInTheDocument()
    expect(within(hero()).getByText('Chrono en cours · 12 min')).toBeInTheDocument()
    const resume = within(hero()).getByRole('button', { name: 'Reprendre' })
    expect(icon(resume, 'timer')).toBeInTheDocument()
    await userEvent.click(resume)
    expect(screen.getByText('at /jouer null')).toBeInTheDocument()
  })

  test('chrono guitare oublié depuis plus de 12 h : pas proposé', () => {
    savePractice(startPractice(new Date(Date.now() - 13 * 3_600_000), 'p'))
    renderToday({})
    expect(within(hero()).getByText('Prochaine séance · Guitare')).toBeInTheDocument()
  })

  test('cette semaine : séances de chaque univers, minutes jouées, séances de sport restantes', async () => {
    const programs = [program({ id: 'a', name: 'Haut' })]
    renderToday({ data: { programs, guitarSessions: [g('2026-10-12', 40)], sportSessions: [ss([], '2026-10-12', 'a'), ss([], '2026-10-14', 'a')] } })
    const week = screen.getByRole('region', { name: 'Cette semaine' })
    expect(within(week).getByRole('progressbar', { name: 'Guitare : 1 sur 5 séances' })).toBeInTheDocument()
    expect(within(week).getByText('40 min jouées')).toBeInTheDocument()
    expect(within(week).getByRole('progressbar', { name: 'Sport : 2 sur 3 séances' })).toBeInTheDocument()
    expect(within(week).getByText('Encore 1 séance')).toBeInTheDocument()
    await userEvent.click(within(week).getByRole('link', { name: 'Voir la semaine' }))
    expect(screen.getByText(/at \/semaine/)).toBeInTheDocument()
  })

  test('sport : 3 séances faites, semaine validée', () => {
    const p = program({ id: 'a', name: 'Haut' })
    renderToday({ data: { programs: [p], sportSessions: ['2026-10-12', '2026-10-13', '2026-10-14'].map((d) => ss([], d, 'a')) } })
    expect(within(screen.getByRole('region', { name: 'Cette semaine' })).getByText('Semaine validée')).toBeInTheDocument()
  })

  test('séance de sport en cours : en héros, exos et séries faites, reprendre', async () => {
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
    savePractice(startPractice(new Date(), 'g'))
    renderToday({ data: { programs: [program({ id: 'p', name: 'Bas', exercises: [a, b] })] } })
    expect(within(hero()).getByText('En cours · Sport')).toBeInTheDocument()
    const items = within(within(hero()).getByRole('list', { name: 'Étapes de la séance' })).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(['Squat3/3 séries', '2Fentes1/3 séries · en cours'])
    expect(icon(items[0], 'check')).toBeInTheDocument()
    await userEvent.click(within(hero()).getByRole('button', { name: 'Reprendre' }))
    expect(screen.getByText('at /log/sport null')).toBeInTheDocument()
    saveLive(null)
  })

  test('morceaux à entretenir (14 j) dans « Aussi aujourd’hui » ; ordre des sections', async () => {
    const songs = [
      { id: 'm1', title: 'Wonderwall', artist: '', status: 'maintain' as const, masteredOn: '2026-09-01' },
      { id: 'm2', title: 'Zombie', artist: '', status: 'maintain' as const, masteredOn: '2026-10-10' },
    ]
    renderToday({ v1: { songs } })
    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(titles).toEqual(['Technique et répertoire', "Aussi aujourd'hui", 'Cette semaine'])
    const also = screen.getByRole('region', { name: "Aussi aujourd'hui" })
    expect(within(also).getByText('Pas joué depuis 44 jours')).toBeInTheDocument()
    // Maîtrisé il y a 5 jours : pas encore.
    expect(within(also).queryByText(/Zombie/)).not.toBeInTheDocument()
    await userEvent.click(within(also).getByRole('button', { name: /Wonderwall/ }))
    expect(screen.getByText('at /log/guitare {"songTitle":"Wonderwall"}')).toBeInTheDocument()
  })

  test('« Autre séance ou séance déjà faite » : toutes les façons de commencer', async () => {
    renderToday({})
    await userEvent.click(screen.getByRole('button', { name: 'Autre séance ou séance déjà faite' }))
    expect(await screen.findByRole('dialog', { name: 'Commencer' })).toBeInTheDocument()
  })
})
