import { describe, expect, test } from 'vitest'
import { getExercise } from '../content/exercises'
import { challenge, ex, g } from '../test/factories'
import { addDays } from './date'
import { dailyPlan } from './dailyPlan'

const today = '2026-10-15'
const ids = (d: Parameters<typeof dailyPlan>[0], day = today) => dailyPlan(d, day).map((e) => e.id)

describe('dailyPlan', () => {
  test('compte neuf : 3 exos distincts, gammes en premier', () => {
    const plan = dailyPlan({ guitarSessions: [], challenges: [] }, today)
    expect(plan).toHaveLength(3)
    expect(plan[0].id).toBe('scales-1')
    expect(new Set(plan.map((e) => e.id)).size).toBe(3)
    expect(new Set(plan.map((e) => e.category)).size).toBe(3)
  })

  test('l’exo du défi en cours n’est jamais proposé', () => {
    const c = challenge({ target: { kind: 'bpm', exerciseId: 'scales-1', bpm: 66, baseline: null } })
    const plan = ids({ guitarSessions: [], challenges: [c] })
    expect(plan).not.toContain('scales-1')
    expect(plan[0]).toBe('scales-2')
    expect(plan).toHaveLength(3)
  })

  test('progression : difficulté suivante dans la dernière catégorie travaillée', () => {
    const plan = dailyPlan({ guitarSessions: [g('2026-10-14', 30, [ex('legato-4', 90)])], challenges: [] }, today)
    expect(plan[0]).toMatchObject({ category: 'legato', difficulty: getExercise('legato-4')!.difficulty + 1 })
  })

  test('logger un exo du jour ne change pas le plan', () => {
    const before = ids({ guitarSessions: [], challenges: [] })
    expect(ids({ guitarSessions: [g(today, 20, [ex('scales-1', 70)])], challenges: [] })).toEqual(before)
  })

  test('exo inconnu dans l’historique ignoré', () => {
    expect(ids({ guitarSessions: [g('2026-10-14', 30, [ex('ghost-1', 90)])], challenges: [] })[0]).toBe('scales-1')
  })

  test('stable sur la journée, varie selon les jours', () => {
    const d = { guitarSessions: [], challenges: [] }
    expect(ids(d)).toEqual(ids(d))
    const thirds = new Set(Array.from({ length: 7 }, (_, i) => ids(d, addDays(today, i))[2]))
    expect(thirds.size).toBeGreaterThan(1)
  })
})
