import { beforeEach, describe, expect, test } from 'vitest'
import { pe, program, set, ss } from '../../test/factories'
import { v1Of } from '../../test/renderWithData'
import { EMPTY_DATA } from '../../domain/types'
import {
  isStale,
  liveReducer,
  loadLive,
  prefillFor,
  recentSetsFor,
  resolveIndex,
  restFor,
  restLeft,
  saveLive,
  tracking,
  type LiveState,
  type Tracking,
} from './liveSession'

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

const at = '2026-10-15T18:10:00.000Z'
const done = { type: 'completeSet', at } as const

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
    s = liveReducer(s, done, exercises)
    s = liveReducer(s, done, exercises)
    s = liveReducer(s, { type: 'nextExercise', prefill: { weightKg: 40, reps: 10 } }, exercises)
    s = liveReducer(s, done, exercises)
    expect(s.sets).toEqual([set(60, 8, 'a', 1), set(60, 8, 'a', 2), set(40, 10, 'b', 1)])
    expect(s).toMatchObject({ exerciseIndex: 1, exerciseId: 'b' })
  })

  test('séance ouverte puis laissée de côté : elle commence à la première série (jour et durée)', () => {
    // Ouverte dimanche 21 h 30 (Paris), première série lundi 7 h 30.
    let s = liveReducer(state({ startedAt: '2026-10-11T19:30:00.000Z' }), { type: 'completeSet', at: '2026-10-12T05:30:00.000Z' }, exercises)
    expect(s.startedAt).toBe('2026-10-12T05:30:00.000Z')
    s = liveReducer(s, { type: 'completeSet', at: '2026-10-12T07:00:00.000Z' }, exercises)
    expect(s.startedAt).toBe('2026-10-12T05:30:00.000Z')
    // Échauffement de 10 min avant la première série : le début ne bouge pas.
    expect(liveReducer(state(), done, exercises).startedAt).toBe('2026-10-15T18:00:00Z')
  })

  test('prevExercise : retour à l’exo précédent avec sa dernière série, rien avant le premier', () => {
    let s = state({ weightKg: 60, reps: 8 })
    s = liveReducer(s, done, exercises)
    s = liveReducer(s, { type: 'nextExercise', prefill: { weightKg: 40, reps: 10 } }, exercises)
    s = liveReducer(s, { type: 'prevExercise', prefill: { weightKg: 0, reps: 1 } }, exercises)
    expect(s).toMatchObject({ exerciseIndex: 0, exerciseId: 'a', weightKg: 60, reps: 8 })
    expect(liveReducer(s, { type: 'prevExercise', prefill: { weightKg: 0, reps: 1 } }, exercises)).toBe(s)
    const finished = liveReducer(s, { type: 'finish' }, exercises)
    expect(liveReducer(finished, { type: 'prevExercise', prefill: { weightKg: 40, reps: 10 } }, exercises)).toMatchObject({
      exerciseId: 'b',
      weightKg: 40,
      reps: 10,
    })
  })

  test('exo courant archivé : on passe au suivant', () => {
    const s = state({ exerciseIndex: 0, exerciseId: 'a' })
    expect(resolveIndex(s, [b])).toBe(0)
    expect(liveReducer(s, done, [b]).sets[0].programExerciseId).toBe('b')
  })

  test('exo précédent supprimé : on reste sur l’exo courant', () => {
    expect(resolveIndex(state({ exerciseIndex: 1, exerciseId: 'b' }), [b])).toBe(0)
  })
})

describe('repos', () => {
  test('restFor : selon les reps visées', () => {
    expect([1, 6, 7, 12, 13, 20].map(restFor)).toEqual([180, 180, 120, 120, 90, 90])
  })

  test('une série lance le repos de l’exo courant', () => {
    const heavy = [a, pe({ id: 'b', position: 1, targetReps: 5 })]
    let s = liveReducer(state({ reps: 8 }), done, heavy)
    expect(s).toMatchObject({ restStartedAt: at, restSec: 120 })
    s = liveReducer(s, { type: 'nextExercise', prefill: { weightKg: 40, reps: 5 } }, heavy)
    s = liveReducer(s, { type: 'completeSet', at: '2026-10-15T18:15:00.000Z' }, heavy)
    expect(s).toMatchObject({ restStartedAt: '2026-10-15T18:15:00.000Z', restSec: 180 })
  })

  test('+30 s, passer, et fin de séance', () => {
    let s = liveReducer(state(), done, exercises)
    s = liveReducer(s, { type: 'restAdd' }, exercises)
    expect(s.restSec).toBe(150)
    expect(liveReducer(s, { type: 'restSkip' }, exercises).restStartedAt).toBeNull()
    expect(liveReducer(s, { type: 'finish' }, exercises).restStartedAt).toBeNull()
    // Sans repos en cours, +30 s ne fait rien.
    const idle = state()
    expect(liveReducer(idle, { type: 'restAdd' }, exercises)).toBe(idle)
  })

  test('restLeft : secondes restantes arrondies au-dessus, au moins 0', () => {
    const s = { restStartedAt: at, restSec: 120 }
    const t = (ms: number) => new Date(new Date(at).getTime() + ms)
    expect(restLeft(s, t(0))).toBe(120)
    expect(restLeft(s, t(17_400))).toBe(103)
    expect(restLeft(s, t(119_999))).toBe(1)
    expect(restLeft(s, t(120_000))).toBe(0)
    expect(restLeft(s, t(300_000))).toBe(0)
    expect(restLeft({ restStartedAt: null, restSec: 120 }, t(0))).toBeNull()
    expect(restLeft({}, t(0))).toBeNull()
  })
})

describe('persistance', () => {
  test('saveLive puis loadLive', () => {
    const s = state({ sets: [set(60, 8, 'a')], restStartedAt: at, restSec: 150 })
    saveLive(s)
    expect(loadLive()).toEqual(s)
    saveLive(null)
    expect(loadLive()).toBeNull()
  })

  test('séance enregistrée avant le minuteur : pas de repos', () => {
    saveLive(state())
    expect(loadLive()).toEqual({ ...state(), restStartedAt: null, restSec: 0 })
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

/** Suivi sans mouvement connu : la clé est l'exo du programme. */
const byExo = (history: ReturnType<typeof ss>[]): Tracking => ({ history, key: (id) => id, movement: () => undefined })

test('prefillFor sans mouvement connu : comme la dernière fois (série la plus lourde), échauffement ignoré', () => {
  const history = [
    ss([set(60, 8, 'a', 1), set(60, 8, 'a', 2)], '2026-10-01'),
    ss([set(20, 12, 'a', 1), set(62.5, 8, 'a', 2), set(62.5, 7, 'a', 3)], '2026-10-08'),
  ]
  expect(prefillFor(a, byExo(history))).toEqual({ weightKg: 62.5, reps: 8, known: true })
  expect(prefillFor(a, byExo([]))).toEqual({ weightKg: 0, reps: 8, known: false })
})

test('prefillFor suit le mouvement d’un programme à l’autre, et propose la cible avec sa raison', () => {
  // « DC » dans le nouveau programme = « Développé couché » de l'ancien (alias).
  const old = pe({ id: 'old', programId: 'p-old', name: 'Développé couché' })
  const fresh = pe({ id: 'new', programId: 'p-new', name: 'DC' })
  const data = {
    ...EMPTY_DATA,
    programs: [program({ id: 'p-old', archived: true, exercises: [old] }), program({ id: 'p-new', exercises: [fresh] })],
    sportSessions: [ss([set(80, 10, 'old', 1), set(80, 10, 'old', 2)], '2026-10-08', 'p-old')],
  }
  const t = tracking(v1Of(data))
  expect(recentSetsFor(t.key('new'), t.history)).toHaveLength(1)
  expect(prefillFor(fresh, t)).toEqual({ weightKg: 82.5, reps: 6, known: true, why: '10 reps sur toutes les séries : +2,5 kg, retour à 6 reps.' })
})

test('recentSetsFor : 3 dernières séances sur l’exo, séries dans l’ordre', () => {
  const history = [
    ss([set(60, 8, 'a', 1)], '2026-09-20'),
    ss([set(62.5, 8, 'a', 2), set(62.5, 8, 'a', 1)], '2026-10-01'),
    ss([set(40, 10, 'b', 1)], '2026-10-05'),
    ss([set(65, 6, 'a', 1)], '2026-10-08'),
    ss([set(57.5, 8, 'a', 1)], '2026-09-10'),
  ]
  expect(recentSetsFor('a', history)).toEqual([
    { day: '2026-10-08', sets: [set(65, 6, 'a', 1)] },
    { day: '2026-10-01', sets: [set(62.5, 8, 'a', 1), set(62.5, 8, 'a', 2)] },
    { day: '2026-09-20', sets: [set(60, 8, 'a', 1)] },
  ])
  expect(recentSetsFor('a', [])).toEqual([])
})
