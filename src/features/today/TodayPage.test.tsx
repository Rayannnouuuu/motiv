import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
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
    expect(within(guitar).getByText("Séance 1 sur 5 cette semaine · encore 30 min pour qu'elle compte")).toBeInTheDocument()
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
    expect(screen.getByText(/at \/moi\/modeles/)).toBeInTheDocument()
  })

  test('une carte se replie et se déplie', async () => {
    renderToday({})
    const header = within(card('Technique et répertoire')).getAllByRole('button')[0]
    expect(header).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(within(card('Technique et répertoire')).queryByRole('button', { name: 'Commencer' })).not.toBeInTheDocument()
  })

  test('rythme : séance du jour à 30 min, pastille des semaines réussies d’affilée', () => {
    // Semaine du 5 oct. réussie : 5 jours de guitare, 3 séances de sport.
    const guitar = ['05', '06', '07', '08', '09'].map((d) => g(`2026-10-${d}`, 30))
    const sport = ['05', '06', '07'].map((d) => ss([], `2026-10-${d}`))
    renderToday({ data: { guitarSessions: [...guitar, g('2026-10-12', 30), g(today, 10)], sportSessions: sport } })
    expect(screen.getByText("1 semaine d'affilée")).toBeInTheDocument()
    expect(within(card('Technique et répertoire')).getByText("Séance 2 sur 5 cette semaine · encore 20 min pour qu'elle compte")).toBeInTheDocument()
  })

  test('60 min aujourd’hui : guitare faite, rejouer reste possible', async () => {
    renderToday({ data: { guitarSessions: [g(today, 60)] } })
    const guitar = await unfold('Guitare faite')
    expect(within(guitar).getByText("60 min aujourd'hui · 1/5 cette semaine")).toBeInTheDocument()
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

  test('séance au choix : Legs au lieu de la séance prévue, avec une course à la fin', async () => {
    const programs = ['Push', 'Pull', 'Legs'].map((name, i) =>
      program({ id: name.toLowerCase(), name, position: i, exercises: [pe({ id: `${name}-1`, programId: name.toLowerCase(), name: `${name} exo` })] }),
    )
    renderToday({ data: { programs, guitarSessions: [g(today, 60)] } })
    const sport = card('Push')
    await userEvent.click(within(sport).getByRole('button', { name: 'Legs' }))
    await userEvent.click(within(card('Legs')).getByRole('button', { name: 'Course à la fin' }))
    const legs = card('Legs + course')
    expect(within(legs).getByText('Legs exo')).toBeInTheDocument()
    expect(within(legs).getByText('Course libre')).toBeInTheDocument()
    await userEvent.click(within(legs).getByRole('button', { name: 'Commencer' }))
    expect(screen.getByText('at /log/sport {"programId":"legs","thenRun":{}}')).toBeInTheDocument()
  })

  test('séance au choix : la course seule', async () => {
    const programs = [program({ id: 'push', name: 'Push', exercises: [pe({ id: 'p1', programId: 'push' })] })]
    renderToday({ data: { programs, guitarSessions: [g(today, 60)] } })
    await userEvent.click(within(card('Push')).getByRole('button', { name: 'Course seule' }))
    await userEvent.click(within(card('Course libre')).getByRole('button', { name: 'Commencer' }))
    expect(screen.getByText('at /course {}')).toBeInTheDocument()
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
    expect(screen.getByText(/at \/plan/)).toBeInTheDocument()
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
