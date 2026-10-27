import { describe, expect, test } from 'vitest'
import { data, ex, g, pe, program, set, ss } from '../test/factories'
import type { Rating } from './types'
import { plateauKey, plateaus, plateauTitle, suggestions } from './plateau'

const today = '2026-10-21'
const days = ['2026-10-01', '2026-10-04', '2026-10-07', '2026-10-10', '2026-10-13', '2026-10-16']

describe('plateau', () => {
  test('tempo : pas de record sur les 4 dernières séances → plateau ; un record parmi elles → rien', () => {
    const stuck = data({ guitarSessions: days.slice(0, 5).map((d, i) => g(d, 30, [ex('legato-4', [100, 96, 98, 100, 97][i])])) })
    const p = plateaus(stuck, today)
    expect(p).toEqual([{ kind: 'record', domain: 'guitar', id: 'legato-4', name: 'Legato 4', best: 100, unit: 'bpm' }])
    expect(plateauTitle(p[0])).toBe('Legato 4 : pas de record depuis 4 séances')
    const moving = data({ guitarSessions: days.slice(0, 5).map((d, i) => g(d, 30, [ex('legato-4', [100, 96, 98, 101, 97][i])])) })
    expect(plateaus(moving, today)).toEqual([])
  })

  test('4 séances seulement : pas assez d’historique ; exo laissé de côté depuis 3 semaines : rien', () => {
    expect(plateaus(data({ guitarSessions: days.slice(0, 4).map((d) => g(d, 30, [ex('legato-4', 90)])) }), today)).toEqual([])
    expect(plateaus(data({ guitarSessions: days.slice(0, 5).map((d) => g(d, 30, [ex('legato-4', 90)])) }), '2026-11-20')).toEqual([])
  })

  test('sport : 1RM estimé qui ne bouge plus', () => {
    const bench = pe({ id: 'pe-b', name: 'Développé couché' })
    const d = data({ programs: [program({ exercises: [bench] })], sportSessions: days.slice(0, 5).map((day) => ss([set(60, 8, 'pe-b')], day)) })
    const [p] = plateaus(d, today)
    expect(p).toMatchObject({ kind: 'record', domain: 'sport', name: 'Développé couché', unit: 'kg', best: 76 })
    expect(suggestions(p, d, today).map((s) => s.label)).toEqual([
      'Change de variante : prise, angle ou version à un bras.',
      'Allège une semaine : environ 57 kg pour tes séries, puis remonte.',
      'Travaille une autre qualité : plus de reps à charge moyenne (8 à 12).',
    ])
  })

  test('envie en baisse 3 séances de suite, en premier ; jamais d’abandon proposé', () => {
    const rated = (r: number[]) => r.map((v, i) => ({ ...g(days[i], 30), desireRating: v as Rating }))
    const d = data({ guitarSessions: rated([4, 5, 4, 3, 2]) })
    const [p] = plateaus(d, today)
    expect(p).toEqual({ kind: 'desire', domain: 'guitar', values: [5, 4, 3, 2] })
    expect(plateauKey(p)).toBe('desire:guitar')
    expect(suggestions(p, d, today).every((s) => !/arrête|abandonne|pause/i.test(s.label))).toBe(true)
    expect(plateaus(data({ guitarSessions: rated([5, 4, 4, 3, 2]) }), today)).toEqual([])
  })

  test('guitare : variante de la même famille, et une sous-compétence peu travaillée', () => {
    const d = data({ guitarSessions: days.slice(0, 5).map((day) => g(day, 30, [ex('legato-4', 90)])) })
    const [p] = plateaus(d, today)
    const [variant, light, other] = suggestions(p, d, today)
    expect(variant.label).toMatch(/^Change de variante : /)
    expect(variant.to).not.toBe('/exo/legato-4')
    expect(variant.to).toMatch(/^\/exo\/legato-/)
    expect(light.label).toBe('Allège une semaine : joue-le propre à 81 bpm, puis remonte.')
    expect(other.label).not.toMatch(/legato/i)
  })
})
