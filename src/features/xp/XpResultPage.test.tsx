import { screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { addDays } from '../../domain/date'
import { challenge, ex, g, ss } from '../../test/factories'
import { icon } from '../../test/icon'
import { renderWithData, type RenderWithDataOptions } from '../../test/renderWithData'
import { XpResultPage } from './XpResultPage'

const routes = (
  <Routes>
    <Route path="/xp" element={<XpResultPage />} />
    <Route path="/" element={<p>accueil</p>} />
  </Routes>
)

test('affiche le total, le détail et la jauge du domaine', () => {
  const result = {
    total: 68,
    lines: [
      { label: '45 min jouées', xp: 45 },
      { label: 'Record de tempo · Legato 4', xp: 10 },
    ],
  }
  renderWithData(routes, { route: { pathname: '/xp', state: { result, domain: 'guitar' } } })
  expect(screen.getByText('+68 XP')).toBeInTheDocument()
  expect(screen.getByText('45 min jouées')).toBeInTheDocument()
  expect(screen.getByText('Record de tempo · Legato 4')).toBeInTheDocument()
  expect(screen.getByRole('progressbar', { name: /Guitare/ })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Continuer' })).toHaveAttribute('href', '/')
})

test('sans résultat : retour à l’accueil', () => {
  renderWithData(routes, { route: '/xp' })
  expect(screen.getByText('accueil')).toBeInTheDocument()
})

test('défi atteint par ce log : « Défi réussi ! »', () => {
  const c = challenge({ createdOn: '2026-10-10', target: { kind: 'bpm', exerciseId: 'legato-6', bpm: 96, baseline: null } })
  const result = { total: 30, lines: [] }
  renderWithData(routes, {
    route: { pathname: '/xp', state: { result, domain: 'guitar' } },
    data: { challenges: [c], guitarSessions: [g('2026-10-15', 30, [ex('legato-6', 96)])] },
  })
  expect(icon(screen.getByText('Défi réussi !'), 'target')).toBeInTheDocument()
  expect(screen.getByText('Legato sur une corde 6 à 96 bpm')).toBeInTheDocument()
})

describe('objectif : série guitare et semaine de sport', () => {
  const today = '2026-10-15' // jeudi
  const result = { total: 25, lines: [] }
  const fireworks = () => document.querySelector('canvas[data-fireworks]')
  /** `n` jours de 60 min jusqu'à hier. */
  const fullDays = (n: number) => Array.from({ length: n }, (_, i) => g(addDays(today, -1 - i), 60))
  const show = (domain: 'guitar' | 'sport', logId: string, data: RenderWithDataOptions['data'], edited?: boolean) =>
    renderWithData(routes, { today, data, route: { pathname: '/xp', state: { result, domain, logId, edited } } })

  // Animations autorisées, comme dans Fireworks.test.tsx, pour voir le canvas.
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('série tenue : « Série tenue ! » et petits feux', () => {
    const log = g(today, 15)
    show('guitar', log.id, { guitarSessions: [...fullDays(12), g(today, 20), log] })
    const goal = screen.getByRole('region', { name: 'Objectif' })
    expect(within(goal).getByText('13 jours')).toBeInTheDocument()
    expect(within(goal).getByText('Série tenue !')).toBeInTheDocument()
    expect(fireworks()).toHaveAttribute('data-fireworks', 'small')
  })

  test('7e jour : palier et grands feux', () => {
    const log = g(today, 60)
    show('guitar', log.id, { guitarSessions: [...fullDays(6), log] })
    expect(screen.getByText('Série tenue · palier de 7 jours')).toBeInTheDocument()
    expect(icon(screen.getByRole('region', { name: 'Objectif' }), 'trophy')).toBeInTheDocument()
    expect(fireworks()).toHaveAttribute('data-fireworks', 'big')
  })

  test('log de 20 min : minutes restantes, pas de feux', () => {
    const log = g(today, 20)
    show('guitar', log.id, { guitarSessions: [log] })
    expect(screen.getByText("20/30 min aujourd'hui")).toBeInTheDocument()
    expect(screen.getByText('Encore 10 min pour lancer ta série')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Objectif du jour : 20 / 30 min' })).toBeInTheDocument()
    expect(fireworks()).toBeNull()
  })

  test('minutes restantes avec une série en cours, hier court : objectif 60', () => {
    const log = g(today, 20)
    show('guitar', log.id, { guitarSessions: [2, 3, 4].map((n) => g(addDays(today, -n), 60)).concat(g(addDays(today, -1), 40), log) })
    expect(screen.getByText("20/60 min aujourd'hui")).toBeInTheDocument()
    expect(screen.getByText('Encore 40 min pour garder ta série de 4 jours')).toBeInTheDocument()
  })

  test('« Hier » qui recolle : série réparée', () => {
    const log = g(addDays(today, -1), 60)
    show('guitar', log.id, { guitarSessions: [g(addDays(today, -2), 60), g(today, 60), log] })
    expect(screen.getByText('Série réparée')).toBeInTheDocument()
    expect(fireworks()).toHaveAttribute('data-fireworks', 'small')
  })

  test('série déjà tenue : bonus discret, pas de feux', () => {
    const log = g(today, 20)
    show('guitar', log.id, { guitarSessions: [g(today, 60), log] })
    expect(screen.getByText("Série déjà tenue aujourd'hui · 1 jour")).toBeInTheDocument()
    expect(fireworks()).toBeNull()
  })

  test('3e séance de sport : « Semaine validée »', () => {
    const log = ss([], today)
    show('sport', log.id, { sportSessions: [ss([], '2026-10-12'), ss([], '2026-10-13'), log] })
    expect(screen.getByText('Semaine validée')).toBeInTheDocument()
    expect(screen.getByText('Première semaine validée')).toBeInTheDocument()
    expect(fireworks()).toHaveAttribute('data-fireworks', 'small')
  })

  test('2e séance de sport : « plus qu’une »', () => {
    const log = ss([], today)
    show('sport', log.id, { sportSessions: [ss([], '2026-10-12'), log] })
    expect(screen.getByText("2/3 cette semaine · plus qu'une")).toBeInTheDocument()
    expect(fireworks()).toBeNull()
  })

  test('4e séance de sport : séance bonus', () => {
    const log = ss([], today)
    show('sport', log.id, { sportSessions: [ss([], '2026-10-12'), ss([], '2026-10-13'), ss([], '2026-10-14'), log] })
    expect(screen.getByText('Séance bonus · 4 cette semaine')).toBeInTheDocument()
  })

  test('log corrigé : aucun bloc « Objectif », pas de feux', () => {
    const log = g(today, 60)
    show('guitar', log.id, { guitarSessions: [...fullDays(6), log] }, true)
    expect(screen.queryByRole('region', { name: 'Objectif' })).toBeNull()
    expect(fireworks()).toBeNull()
  })
})

test('course prévue à la fin de la muscu : « Enchaîner la course »', () => {
  const result = { total: 40, lines: [] }
  renderWithData(routes, { route: { pathname: '/xp', state: { result, domain: 'sport', thenRun: { day: '2026-10-15', kind: 'easy' } } } })
  expect(screen.getByRole('link', { name: 'Enchaîner la course' })).toHaveAttribute('href', '/course')
  expect(screen.getByRole('link', { name: "Pas de course aujourd'hui" })).toHaveAttribute('href', '/')
})
