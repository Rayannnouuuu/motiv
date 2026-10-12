import { describe, expect, test } from 'vitest'
import { g, program, ss } from '../test/factories'
import { nextAction } from './nextAction'
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
    expect(run(base(), { sportLiveProgram: 'Bas', guitarLiveMin: 12 })).toEqual({ kind: 'resumeSport', label: '🏋️ Reprendre Bas', to: '/log/sport' })
  })

  test('chrono guitare en cours : reprendre la guitare', () => {
    expect(run(base(), { guitarLiveMin: 12 })).toEqual({ kind: 'resumeGuitar', label: '⏱ Reprendre la guitare · 12 min', to: '/jouer' })
  })

  test('objectif guitare pas atteint : jouer les minutes restantes', () => {
    expect(run(base({ guitarSessions: [g(today, 35)] }))).toEqual({
      kind: 'playGuitar',
      label: '▶︎ Jouer · encore 25 min',
      to: '/jouer',
      state: { autostart: true },
    })
  })

  test('guitare faite, séance de sport due : commencer la prochaine séance', () => {
    const data = base({ guitarSessions: [g(today, 60)], sportSessions: [ss([], '2026-10-13', 'haut')] })
    expect(run(data)).toEqual({ kind: 'startSport', label: '🏋️ Commencer Bas', to: '/log/sport', state: { programId: 'bas' } })
  })

  test('guitare faite, sport déjà fait aujourd’hui : journée bouclée', () => {
    const data = base({ guitarSessions: [g(today, 60)], sportSessions: [ss([], today, 'haut')] })
    expect(run(data)).toEqual({ kind: 'done', label: 'Journée bouclée ✓' })
  })

  test('guitare faite, semaine de sport validée : journée bouclée', () => {
    const sportSessions = ['2026-10-12', '2026-10-13', '2026-10-14'].map((d) => ss([], d, 'haut'))
    expect(run(base({ guitarSessions: [g(today, 60)], sportSessions })).kind).toBe('done')
  })

  test('guitare faite, aucun programme : journée bouclée', () => {
    expect(run(base({ guitarSessions: [g(today, 60)], programs: [] })).kind).toBe('done')
  })
})
