import { beforeEach, describe, expect, test } from 'vitest'
import { pe, set, ss } from '../../test/factories'
import { isStale, liveReducer, loadLive, prefillFor, recentSetsFor, resolveIndex, saveLive, type LiveState } from './liveSession'

const a = pe({ id: 'a', position: 0 })
const b = pe({ id: 'b', position: 1, name: 'Rowing' })
const exercises = [a, b]

const state = (over: Partial<LiveState> = {}): LiveState => ({
  id: 'live',
  programId: 'p1',
  startedAt: '2026-10-15T18:00:00Z',
  exerciseIndex: 0,
  exerciseId: 'a',
  weightKg: 2.5,
  reps: 1,
  sets: [],
  ...over,
})

beforeEach(() => localStorage.clear())

describe('liveReducer', () => {
  test('charge ≥ 0, reps ≥ 1', () => {
    let s = liveReducer(state(), { type: 'weight', delta: -2.5 }, exercises)
    s = liveReducer(s, { type: 'weight', delta: -2.5 }, exercises)
    expect(s.weightKg).toBe(0)
    expect(liveReducer(s, { type: 'reps', delta: -1 }, exercises).reps).toBe(1)
    expect(liveReducer(s, { type: 'setWeight', weightKg: -5 }, exercises).weightKg).toBe(0)
  })

  test('completeSet numérote les séries par exo', () => {
    let s = state({ weightKg: 60, reps: 8 })
    s = liveReducer(s, { type: 'completeSet' }, exercises)
    s = liveReducer(s, { type: 'completeSet' }, exercises)
    s = liveReducer(s, { type: 'nextExercise', prefill: { weightKg: 40, reps: 10 } }, exercises)
    s = liveReducer(s, { type: 'completeSet' }, exercises)
    expect(s.sets).toEqual([set(60, 8, 'a', 1), set(60, 8, 'a', 2), set(40, 10, 'b', 1)])
    expect(s).toMatchObject({ exerciseIndex: 1, exerciseId: 'b' })
  })

  test('prevExercise : retour à l’exo précédent avec sa dernière série, rien avant le premier', () => {
    let s = state({ weightKg: 60, reps: 8 })
    s = liveReducer(s, { type: 'completeSet' }, exercises)
    s = liveReducer(s, { type: 'nextExercise', prefill: { weightKg: 40, reps: 10 } }, exercises)
    s = liveReducer(s, { type: 'prevExercise', prefill: { weightKg: 0, reps: 1 } }, exercises)
    expect(s).toMatchObject({ exerciseIndex: 0, exerciseId: 'a', weightKg: 60, reps: 8 })
    expect(liveReducer(s, { type: 'prevExercise', prefill: { weightKg: 0, reps: 1 } }, exercises)).toBe(s)
    const finished = liveReducer(s, { type: 'finish' }, exercises)
    expect(liveReducer(finished, { type: 'prevExercise', prefill: { weightKg: 40, reps: 10 } }, exercises)).toMatchObject({ exerciseId: 'b', weightKg: 40, reps: 10 })
  })

  test('exo courant archivé : on passe au suivant', () => {
    const s = state({ exerciseIndex: 0, exerciseId: 'a' })
    expect(resolveIndex(s, [b])).toBe(0)
    expect(liveReducer(s, { type: 'completeSet' }, [b]).sets[0].programExerciseId).toBe('b')
  })

  test('exo précédent supprimé : on reste sur l’exo courant', () => {
    expect(resolveIndex(state({ exerciseIndex: 1, exerciseId: 'b' }), [b])).toBe(0)
  })
})

describe('persistance', () => {
  test('saveLive puis loadLive', () => {
    saveLive(state({ sets: [set(60, 8, 'a')] }))
    expect(loadLive()).toEqual(state({ sets: [set(60, 8, 'a')] }))
    saveLive(null)
    expect(loadLive()).toBeNull()
  })

  test('JSON corrompu → null', () => {
    localStorage.setItem('motiv.liveSport.v1', '{oops')
    expect(loadLive()).toBeNull()
    localStorage.setItem('motiv.liveSport.v1', '{"id":3}')
    expect(loadLive()).toBeNull()
  })
})

test('isStale après 12 h 01', () => {
  const s = state({ startedAt: '2026-10-15T06:00:00Z' })
  expect(isStale(s, new Date('2026-10-15T18:00:00Z'))).toBe(false)
  expect(isStale(s, new Date('2026-10-15T18:01:00Z'))).toBe(true)
})

test('prefillFor : série la plus lourde de la dernière séance', () => {
  const history = [
    ss([set(60, 8, 'a'), set(60, 8, 'a')], '2026-10-01'),
    ss([set(60, 8, 'a'), set(62.5, 8, 'a'), set(62.5, 8, 'a'), set(62.5, 7, 'a')], '2026-10-08'),
  ]
  expect(prefillFor(a, history)).toEqual({ weightKg: 62.5, reps: 8, summary: 'Dernière fois : 4×8 à 62,5 kg' })
  expect(prefillFor(a, [])).toEqual({ weightKg: 0, reps: 8, summary: null })
  expect(prefillFor(a, [ss([set(0, 12, 'a')])]).summary).toBe('Dernière fois : 1×12 au PDC')
})

test('recentSetsFor : 3 dernières séances sur l’exo, séries dans l’ordre', () => {
  const history = [
    ss([set(60, 8, 'a', 1)], '2026-09-20'),
    ss([set(62.5, 8, 'a', 2), set(62.5, 8, 'a', 1)], '2026-10-01'),
    ss([set(40, 10, 'b', 1)], '2026-10-05'),
    ss([set(65, 6, 'a', 1)], '2026-10-08'),
    ss([set(57.5, 8, 'a', 1)], '2026-09-10'),
  ]
  expect(recentSetsFor(a, history)).toEqual([
    { day: '2026-10-08', sets: [set(65, 6, 'a', 1)] },
    { day: '2026-10-01', sets: [set(62.5, 8, 'a', 1), set(62.5, 8, 'a', 2)] },
    { day: '2026-09-20', sets: [set(60, 8, 'a', 1)] },
  ])
  expect(recentSetsFor(a, [])).toEqual([])
})
