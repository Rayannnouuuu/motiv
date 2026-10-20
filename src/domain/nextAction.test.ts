import { describe, expect, test } from 'vitest'
import { g, program, ss } from '../test/factories'
import { nextAction, todayQueue } from './nextAction'
import type { AppData } from './types'

const today = '2026-10-15' // jeudi

const base = (over: Partial<Pick<AppData, 'guitarSessions' | 'sportSessions' | 'programs'>> = {}) => ({
  guitarSessions: [],
  sportSessions: [],
  programs: [program({ id: 'haut', name: 'Haut', position: 0 }), program({ id: 'bas', name: 'Bas', position: 1 })],
  ...over,
})

const run = (data: ReturnType<typeof base>, live: { guitarLiveMin?: number | null; sportLiveProgram?: string | null } = {}) =>
  nextAction({ data, today, guitarLiveMin: live.guitarLiveMin ?? null, sportLiveProgram: live.sportLiveProgram ?? null })

describe('nextAction', () => {
  test('séance de sport en cours : reprendre, avant tout le reste', () => {
    expect(run(base(), { sportLiveProgram: 'Bas', guitarLiveMin: 12 })).toEqual({ kind: 'resumeSport', label: 'Reprendre Bas', to: '/log/sport' })
  })

  test('chrono guitare en cours : reprendre la guitare', () => {
    expect(run(base(), { guitarLiveMin: 12 })).toEqual({ kind: 'resumeGuitar', label: 'Reprendre la guitare · 12 min', to: '/jouer' })
  })

  test('objectif guitare pas atteint : jouer les minutes restantes', () => {
    expect(run(base({ guitarSessions: [g(today, 5)] }))).toEqual({
      kind: 'playGuitar',
      label: 'Jouer · encore 25 min',
      to: '/jouer',
      state: { autostart: true },
    })
  })

  test('guitare faite, séance de sport due : commencer la prochaine séance', () => {
    const data = base({ guitarSessions: [g(today, 60)], sportSessions: [ss([], '2026-10-13', 'haut')] })
    expect(run(data)).toEqual({ kind: 'startSport', label: 'Commencer Bas', to: '/log/sport', state: { programId: 'bas' } })
  })

  test('guitare faite, sport déjà fait aujourd’hui : journée bouclée', () => {
    const data = base({ guitarSessions: [g(today, 60)], sportSessions: [ss([], today, 'haut')] })
    expect(run(data)).toEqual({ kind: 'done', label: 'Journée bouclée' })
  })

  test('guitare faite, semaine de sport validée : journée bouclée', () => {
    const sportSessions = ['2026-10-12', '2026-10-13', '2026-10-14'].map((d) => ss([], d, 'haut'))
    expect(run(base({ guitarSessions: [g(today, 60)], sportSessions })).kind).toBe('done')
  })

  test('guitare faite, aucun programme : journée bouclée', () => {
    expect(run(base({ guitarSessions: [g(today, 60)], programs: [] })).kind).toBe('done')
  })
})

describe('todayQueue', () => {
  const planned = { label: 'Footing facile', to: '/course', state: { day: today, kind: 'easy' } }

  test('guitare à jouer puis sortie du plan : les deux, guitare d’abord', () => {
    const q = todayQueue({ data: base(), today, guitarLiveMin: null, sportLiveProgram: null, planned })
    expect(q.map((a) => a.kind)).toEqual(['playGuitar', 'startPlanned'])
    expect(q[1]).toEqual({ kind: 'startPlanned', ...planned })
  })

  test('sortie du plan : passe avant le programme, même si du sport est déjà fait aujourd’hui', () => {
    const data = base({ guitarSessions: [g(today, 60)], sportSessions: [ss([], today, 'haut')] })
    expect(nextAction({ data, today, guitarLiveMin: null, sportLiveProgram: null, planned }).kind).toBe('startPlanned')
  })

  test('séance de sport en cours : pas d’autre séance de sport proposée', () => {
    const q = todayQueue({ data: base(), today, guitarLiveMin: null, sportLiveProgram: 'Bas', planned })
    expect(q.map((a) => a.kind)).toEqual(['resumeSport', 'playGuitar'])
  })
})
