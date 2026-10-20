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

const card = (title: string | RegExp) => screen.getByRole('region', { name: title })
/** Déplie une carte fermée (un toucher sur son en-tête). */
const unfold = async (title: string | RegExp) => {
  const header = within(card(title)).getAllByRole('button')[0]
  if (header.getAttribute('aria-expanded') === 'false') await userEvent.click(header)
  return card(title)
}

describe('TodayPage', () => {
  test('compte neuf : guitare et sport en deux cartes ; la guitare, prochaine séance, est ouverte', async () => {
    renderToday({})
    const guitar = card('Technique et répertoire')
    expect(within(guitar).getByText('Guitare · Prochaine séance')).toBeInTheDocument()
    expect(within(guitar).getByText("30 min aujourd'hui pour lancer ta série")).toBeInTheDocument()
    expect(within(guitar).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3)
    expect(card('Pas encore de programme')).toBeInTheDocument()
    const start = within(guitar).getByRole('button', { name: 'Commencer' })
    expect(start).toHaveClass('bg-guitar')
    expect(icon(start, 'play')).toBeInTheDocument()
    await userEvent.click(start)
    expect(screen.getByText('at /jouer {"autostart":true}')).toBeInTheDocument()
  })

  test('compte neuf : sans programme, la carte sport propose d’en choisir un', async () => {
    renderToday({})
    await userEvent.click(within(await unfold('Pas encore de programme')).getByRole('button', { name: 'Choisir ton programme' }))
    expect(screen.getByText(/at \/bibliotheque/)).toBeInTheDocument()
  })

  test('une carte se replie et se déplie', async () => {
    renderToday({})
    const header = within(card('Technique et répertoire')).getAllByRole('button')[0]
    expect(header).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(within(card('Technique et répertoire')).queryByRole('button', { name: 'Commencer' })).not.toBeInTheDocument()
  })

  test('hier court (40 min), 35 min aujourd’hui, série de 12 : pastille et minutes qui manquent', () => {
    const past = Array.from({ length: 12 }, (_, i) => g(addDays(today, -(i + 1)), i === 0 ? 40 : 60))
    renderToday({ data: { guitarSessions: [...past, g(today, 35)] } })
    expect(screen.getByText("12 jours d'affilée")).toBeInTheDocument()
    expect(within(card('Technique et répertoire')).getByText('Encore 25 min pour tenir la série de 12 jours')).toBeInTheDocument()
  })

  test('série cassée : le record est rappelé', () => {
    const past = Array.from({ length: 5 }, (_, i) => g(addDays('2026-10-10', -i), 60))
    renderToday({ data: { guitarSessions: past } })
    expect(within(card('Technique et répertoire')).getByText('Encore 30 min · record : 5 jours')).toBeInTheDocument()
  })

  test('60 min aujourd’hui : guitare faite, rejouer reste possible', async () => {
    renderToday({ data: { guitarSessions: [g(today, 60)] } })
    const guitar = await unfold('Guitare faite')
    expect(within(guitar).getByText('Guitare · Faite')).toBeInTheDocument()
    await userEvent.click(within(guitar).getByRole('button', { name: 'Rejouer avec le chrono' }))
    expect(screen.getByText('at /jouer {"autostart":true}')).toBeInTheDocument()
  })

  test('guitare faite, séance de sport due : la carte sport passe en premier, ouverte, exos et charges de la dernière fois', async () => {
    const squat = pe({ id: 'squat', programId: 'b', name: 'Squat', targetSets: 4, targetReps: 8 })
    const programs = [program({ id: 'a', name: 'Haut', position: 0 }), program({ id: 'b', name: 'Bas', position: 1, exercises: [squat] })]
    renderToday({
      data: { programs, guitarSessions: [g(today, 60)], sportSessions: [ss([set(80, 8, 'squat')], '2026-10-12', 'b'), ss([], '2026-10-14', 'a')] },
    })
    expect(screen.getAllByRole('heading', { level: 2 })).toBeDefined()
    const regions = screen.getAllByRole('region').map((r) => r.getAttribute('aria-labelledby'))
    const sport = card('Bas')
    expect(regions.indexOf(sport.getAttribute('aria-labelledby'))).toBeLessThan(regions.indexOf(card('Guitare faite').getAttribute('aria-labelledby')))
    expect(within(sport).getByText('Sport · Prochaine séance')).toBeInTheDocument()
    expect(within(sport).getByText('4×8 · 80 kg')).toBeInTheDocument()
    const start = within(sport).getByRole('button', { name: 'Commencer' })
    expect(start).toHaveClass('bg-sport')
    await userEvent.click(start)
    expect(screen.getByText('at /log/sport {"programId":"b"}')).toBeInTheDocument()
  })

  test('guitare à jouer et sport dû : la carte sport, fermée, se déplie et se lance', async () => {
    renderToday({ data: { programs: [program({ id: 'a', name: 'Haut', position: 0 })] } })
    await userEvent.click(within(await unfold('Haut')).getByRole('button', { name: 'Commencer' }))
    expect(screen.getByText('at /log/sport {"programId":"a"}')).toBeInTheDocument()
  })

  test('guitare et sport faits aujourd’hui : deux cartes faites', () => {
    const programs = [program({ id: 'a', name: 'Haut', position: 0 }), program({ id: 'b', name: 'Bas', position: 1 })]
    renderToday({ data: { programs, guitarSessions: [g(today, 60)], sportSessions: [ss([], today, 'a')] } })
    expect(within(card('Sport fait')).getByText('Haut')).toBeInTheDocument()
    expect(card('Guitare faite')).toBeInTheDocument()
  })

  test('chrono guitare en cours : la reprendre', async () => {
    savePractice(startPractice(new Date(Date.now() - 12 * 60_000), 'p'))
    renderToday({ data: { guitarSessions: [g(today, 60)] } })
    const guitar = card('Technique et répertoire')
    expect(within(guitar).getByText('Guitare · En cours')).toBeInTheDocument()
    expect(within(guitar).getByText('Chrono en cours · 12 min')).toBeInTheDocument()
    const resume = within(guitar).getByRole('button', { name: 'Reprendre' })
    expect(icon(resume, 'timer')).toBeInTheDocument()
    await userEvent.click(resume)
    expect(screen.getByText('at /jouer null')).toBeInTheDocument()
  })

  test('chrono guitare oublié depuis plus de 12 h : pas proposé', () => {
    savePractice(startPractice(new Date(Date.now() - 13 * 3_600_000), 'p'))
    renderToday({})
    expect(within(card('Technique et répertoire')).getByText('Guitare · Prochaine séance')).toBeInTheDocument()
  })

  test('cette semaine : séances de chaque univers, minutes jouées, séances de sport restantes', async () => {
    const programs = [program({ id: 'a', name: 'Haut' })]
    renderToday({ data: { programs, guitarSessions: [g('2026-10-12', 40)], sportSessions: [ss([], '2026-10-12', 'a'), ss([], '2026-10-14', 'a')] } })
    const week = card('Cette semaine')
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
    expect(within(card('Cette semaine')).getByText('Semaine validée')).toBeInTheDocument()
  })

  test('séance de sport en cours : carte ouverte en premier, exos et séries faites, reprendre', async () => {
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
    const sport = card('Bas')
    expect(within(sport).getByText('Sport · En cours')).toBeInTheDocument()
    const items = within(within(sport).getByRole('list', { name: 'Étapes · Sport' })).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(['Squat3/3 séries', '2Fentes1/3 séries · en cours'])
    expect(icon(items[0], 'check')).toBeInTheDocument()
    await userEvent.click(within(sport).getByRole('button', { name: 'Reprendre' }))
    expect(screen.getByText('at /log/sport null')).toBeInTheDocument()
    saveLive(null)
  })

  test('morceaux à entretenir (14 j) dans « Aussi aujourd’hui »', async () => {
    const songs = [
      { id: 'm1', title: 'Wonderwall', artist: '', status: 'maintain' as const, masteredOn: '2026-09-01' },
      { id: 'm2', title: 'Zombie', artist: '', status: 'maintain' as const, masteredOn: '2026-10-10' },
    ]
    renderToday({ v1: { songs } })
    const also = card("Aussi aujourd'hui")
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
