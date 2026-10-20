import { describe, expect, test } from 'vitest'
import { getExercise } from '../content/exercises'
import { challenge, data, ex, g, mkSong, pe, program, set, ss } from '../test/factories'
import { canOfferEasier, canReroll, describeTarget, easierTarget, generateGuitarTarget, generateSportTarget, isChallengeMet, roundEven } from './challenges'
import type { ChallengeTarget } from './types'

const today = '2026-10-15'
const yesterday = '2026-10-14'
const first = () => 0
const last = () => 0.99

test('roundEven', () => {
  expect(roundEven(105)).toBe(106)
  expect(roundEven(108.9)).toBe(108)
})

describe('génération guitare (plus dur que les exos du jour)', () => {
  test('règle 1 : 2 niveaux au-dessus du plus dur travaillé dans la catégorie, à son tempo cible', () => {
    const d = data({ guitarSessions: [g(yesterday, 30, [ex('legato-4', 80)])] })
    expect(generateGuitarTarget(d, today, first, [])).toEqual({ kind: 'bpm', exerciseId: 'legato-6', bpm: 96, baseline: null })
  })

  test('règle 1 : plafonnée au niveau 10', () => {
    const d = data({ guitarSessions: [g(yesterday, 30, [ex('legato-9', 100)])] })
    expect(generateGuitarTarget(d, today, first, [])).toMatchObject({ exerciseId: 'legato-10', bpm: 120 })
  })

  test('règle 2 : +15 % (au moins +6 bpm) sur un exo récent, jusqu’à 10 % au-dessus du tempo cible', () => {
    // legato-10 (cible 120) : la règle 1 n'a rien au-dessus une fois legato-10 au tempo cible.
    const d = data({ guitarSessions: [g(yesterday, 30, [ex('legato-10', 120)])] })
    expect(generateGuitarTarget(d, today, first, [])).toEqual({ kind: 'bpm', exerciseId: 'legato-10', bpm: 132, baseline: 120 })
    const slow = data({ guitarSessions: [g(yesterday, 30, [ex('legato-10', 30)])] })
    expect(generateGuitarTarget(slow, today, first, [{ kind: 'bpm', exerciseId: 'legato-10', bpm: 120, baseline: 30 }])).toMatchObject({ bpm: 36 })
  })

  test('règle 3 : morceau en cours', () => {
    const s = mkSong({ id: 's1' })
    expect(generateGuitarTarget(data({ songs: [s] }), today, first, [])).toEqual({ kind: 'song', songId: 's1' })
  })

  test('aucun historique → gammes niveau 3 à leur tempo cible', () => {
    expect(generateGuitarTarget(data(), today, first, [])).toEqual({
      kind: 'bpm',
      exerciseId: 'scales-3',
      bpm: getExercise('scales-3')!.targetBpm,
      baseline: null,
    })
  })

  test('exos inconnus ignorés ; sans exo récent, une catégorie déjà travaillée', () => {
    expect(generateGuitarTarget(data({ guitarSessions: [g(yesterday, 30, [ex('ghost-1', 100)])] }), today, first, [])).toMatchObject({ exerciseId: 'scales-3' })
    const d = data({ guitarSessions: [g('2026-09-25', 30, [ex('legato-4', 100)])] })
    expect(generateGuitarTarget(d, today, first, [])).toMatchObject({ exerciseId: 'legato-6' })
  })

  test('défi suivant après le repli réussi : plus le même', () => {
    const d = data({ guitarSessions: [g('2026-09-01', 30, [ex('scales-3', 80)])] })
    expect(generateGuitarTarget(d, today, first, [{ kind: 'bpm', exerciseId: 'scales-3', bpm: 78, baseline: null }])).toMatchObject({ exerciseId: 'scales-5' })
  })

  test('le 14e jour en arrière compte encore', () => {
    const d = data({ guitarSessions: [g('2026-10-02', 30, [ex('legato-4', 80)])] })
    expect(generateGuitarTarget(d, today, first, [])).toMatchObject({ exerciseId: 'legato-6' })
  })

  test('exclude écarte une cible déjà proposée (relance)', () => {
    const d = data({ guitarSessions: [g(yesterday, 30, [ex('legato-4', 80), ex('picking-4', 80)])] })
    const a = generateGuitarTarget(d, today, first, [])
    const b = generateGuitarTarget(d, today, first, [a])
    expect(b).not.toEqual(a)
    expect(b).toMatchObject({ kind: 'bpm', bpm: 96 })
  })
})

describe('génération sport', () => {
  const bench = pe({ id: 'pe1', programId: 'p1', name: 'Développé couché' })
  const prog = program({ id: 'p1', exercises: [bench] })

  test('+5 kg aux mêmes reps, ou +3 reps', () => {
    const d = data({ programs: [prog], sportSessions: [ss([set(60, 8, 'pe1'), set(55, 10, 'pe1')], yesterday)] })
    expect(generateSportTarget(d, today, first, [])).toEqual({ kind: 'weight', programExerciseId: 'pe1', reps: 8, weightKg: 65, baseline: 60 })
    expect(generateSportTarget(d, today, last, [])).toEqual({ kind: 'reps', programExerciseId: 'pe1', weightKg: 60, reps: 11, baseline: 8 })
  })

  test('poids du corps → toujours reps', () => {
    const d = data({ programs: [prog], sportSessions: [ss([set(0, 6, 'pe1')], yesterday)] })
    expect(generateSportTarget(d, today, first, [])).toEqual({ kind: 'reps', programExerciseId: 'pe1', weightKg: 0, reps: 9, baseline: 6 })
  })

  test('exo archivé ignoré', () => {
    const d = data({
      programs: [program({ id: 'p1', exercises: [{ ...bench, archived: true }] })],
      sportSessions: [ss([set(60, 8, 'pe1')], yesterday)],
    })
    expect(generateSportTarget(d, today, first, [])).toEqual({ kind: 'sessionsInWeek', count: 4 })
  })

  test('sans historique → 4 séances dans la semaine', () => {
    expect(generateSportTarget(data(), today, first, [])).toEqual({ kind: 'sessionsInWeek', count: 4 })
  })
})

describe('réussite', () => {
  const target: ChallengeTarget = { kind: 'bpm', exerciseId: 'legato-10', bpm: 110, baseline: 100 }

  test('ne regarde que les logs à partir de createdOn', () => {
    const c = challenge({ target, createdOn: today })
    expect(isChallengeMet(c, data({ guitarSessions: [g(yesterday, 30, [ex('legato-10', 112)])] }))).toBe(false)
    expect(isChallengeMet(c, data({ guitarSessions: [g(today, 30, [ex('legato-10', 110)])] }))).toBe(true)
  })

  test('morceau maîtrisé', () => {
    const c = challenge({ target: { kind: 'song', songId: 's1' } })
    expect(isChallengeMet(c, data({ songs: [mkSong({ id: 's1' })] }))).toBe(false)
    expect(isChallengeMet(c, data({ songs: [mkSong({ id: 's1', status: 'mastered', masteredOn: today })] }))).toBe(true)
  })

  test('charge et reps atteintes sur une même série', () => {
    const c = challenge({
      domain: 'sport',
      createdOn: '2026-10-10',
      target: { kind: 'weight', programExerciseId: 'pe1', reps: 8, weightKg: 62.5, baseline: 60 },
    })
    expect(isChallengeMet(c, data({ sportSessions: [ss([set(62.5, 7, 'pe1')], today)] }))).toBe(false)
    expect(isChallengeMet(c, data({ sportSessions: [ss([set(65, 8, 'pe1')], today)] }))).toBe(true)
  })

  test('sessionsInWeek : 3 séances dans une même semaine lun→dim', () => {
    const c = challenge({ domain: 'sport', createdOn: '2026-10-08', target: { kind: 'sessionsInWeek', count: 3 } })
    const split = [ss([], '2026-10-09'), ss([], '2026-10-10'), ss([], '2026-10-12')] // jeu, ven | lun
    expect(isChallengeMet(c, data({ sportSessions: split }))).toBe(false)
    const same = [ss([], '2026-10-12'), ss([], '2026-10-13'), ss([], '2026-10-15')]
    expect(isChallengeMet(c, data({ sportSessions: same }))).toBe(true)
  })
})

describe('version plus facile et relances', () => {
  test("easierTarget réduit l'écart de moitié", () => {
    expect(easierTarget({ kind: 'bpm', exerciseId: 'legato-10', bpm: 110, baseline: 100 })).toEqual({
      kind: 'bpm',
      exerciseId: 'legato-10',
      bpm: 106,
      baseline: 100,
    })
    expect(easierTarget({ kind: 'bpm', exerciseId: 'x', bpm: 120, baseline: null })).toEqual({ kind: 'bpm', exerciseId: 'x', bpm: 108, baseline: null })
    expect(easierTarget({ kind: 'weight', programExerciseId: 'p', reps: 8, weightKg: 65, baseline: 60 })).toMatchObject({ weightKg: 62.5 })
    expect(easierTarget({ kind: 'weight', programExerciseId: 'p', reps: 8, weightKg: 62.5, baseline: 60 })).toMatchObject({ weightKg: 61.25 })
    expect(easierTarget({ kind: 'reps', programExerciseId: 'p', weightKg: 60, reps: 11, baseline: 8 })).toMatchObject({ reps: 10 })
    expect(easierTarget({ kind: 'song', songId: 's' })).toBeNull()
    expect(easierTarget({ kind: 'sessionsInWeek', count: 3 })).toBeNull()
  })

  test('canOfferEasier : actif, pas déjà facile, bloqué depuis ≥ 14 jours, variante possible', () => {
    const base = challenge({ target: { kind: 'bpm', exerciseId: 'legato-10', bpm: 110, baseline: 100 }, blockedSince: '2026-10-01' })
    expect(canOfferEasier(base, today)).toBe(true)
    expect(canOfferEasier({ ...base, blockedSince: '2026-10-02' }, today)).toBe(false)
    expect(canOfferEasier({ ...base, blockedSince: null }, today)).toBe(false)
    expect(canOfferEasier({ ...base, easier: true }, today)).toBe(false)
    expect(canOfferEasier({ ...base, status: 'done' }, today)).toBe(false)
    expect(canOfferEasier({ ...base, target: { kind: 'song', songId: 's' } }, today)).toBe(false)
  })

  test('canReroll : 2 relances max', () => {
    expect(canReroll(challenge({ rerolls: 1 }))).toBe(true)
    expect(canReroll(challenge({ rerolls: 2 }))).toBe(false)
    expect(canReroll(challenge({ status: 'done' }))).toBe(false)
  })
})

test('describeTarget', () => {
  const d = data({
    songs: [mkSong({ id: 's1', title: 'Paranoid' })],
    programs: [program({ exercises: [pe({ id: 'pe1', name: 'Tractions' })] })],
  })
  expect(describeTarget({ kind: 'bpm', exerciseId: 'legato-4', bpm: 84, baseline: 80 }, d)).toBe('Legato 4 à 84 bpm')
  expect(describeTarget({ kind: 'bpm', exerciseId: 'ghost', bpm: 84, baseline: 80 }, d)).toBe('Exo inconnu à 84 bpm')
  expect(describeTarget({ kind: 'song', songId: 's1' }, d)).toBe('Maîtriser « Paranoid »')
  expect(describeTarget({ kind: 'weight', programExerciseId: 'pe1', reps: 8, weightKg: 62.5, baseline: 60 }, d)).toBe('Tractions : 8 reps à 62,5 kg')
  expect(describeTarget({ kind: 'reps', programExerciseId: 'pe1', weightKg: 0, reps: 10, baseline: 8 }, d)).toBe('Tractions : 10 reps au poids du corps')
  expect(describeTarget({ kind: 'sessionsInWeek', count: 3 }, d)).toBe('3 séances de sport dans la même semaine')
})

test('version plus facile identique à la cible : pas proposée', () => {
  const c = challenge({ target: { kind: 'bpm', exerciseId: 'scales-10', bpm: 132, baseline: 130 }, blockedSince: '2026-09-01' })
  expect(canOfferEasier(c, '2026-10-15')).toBe(false)
})
