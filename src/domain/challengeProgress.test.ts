import { expect, test } from 'vitest'
import { challenge, data, ex, g, mkSong, set, ss } from '../test/factories'
import { challengeProgress, challengeRoute } from './challengeProgress'

const today = '2026-10-15'

test('bpm : meilleur tempo depuis la création du défi', () => {
  const ch = challenge({ createdOn: '2026-10-10', target: { kind: 'bpm', exerciseId: 'legato-4', bpm: 90, baseline: 80 } })
  const d = data({ guitarSessions: [g('2026-10-09', 30, [ex('legato-4', 95)]), g('2026-10-12', 30, [ex('legato-4', 84)])] })
  expect(challengeProgress(ch, d, today)).toEqual({ current: 84, target: 90, unit: 'bpm' })
  expect(challengeRoute(ch)).toBe('/exo/legato-4')
})

test('charge : meilleure charge aux reps visées ; reps : meilleures reps à la charge visée', () => {
  const d = data({ sportSessions: [ss([set(62.5, 8, 'pe1'), set(65, 6, 'pe1'), set(60, 10, 'pe1')], '2026-10-12')] })
  const w = challenge({ domain: 'sport', target: { kind: 'weight', programExerciseId: 'pe1', reps: 8, weightKg: 65, baseline: 62.5 } })
  expect(challengeProgress(w, d, today)).toEqual({ current: 62.5, target: 65, unit: 'kg' })
  const r = challenge({ domain: 'sport', target: { kind: 'reps', programExerciseId: 'pe1', weightKg: 60, reps: 12, baseline: 10 } })
  expect(challengeProgress(r, d, today)).toEqual({ current: 10, target: 12, unit: 'reps' })
  expect(challengeRoute(r)).toBe('/log/sport')
})

test('séances dans la semaine en cours ; morceau maîtrisé', () => {
  const s = challenge({ domain: 'sport', target: { kind: 'sessionsInWeek', count: 3 } })
  expect(challengeProgress(s, data({ sportSessions: [ss([], '2026-10-12'), ss([], '2026-10-14'), ss([], '2026-10-05')] }), today)).toEqual({
    current: 2,
    target: 3,
    unit: 'séances',
  })
  const song = challenge({ target: { kind: 'song', songId: 's1' } })
  expect(challengeProgress(song, data({ songs: [mkSong({ id: 's1' })] }), today).current).toBe(0)
  expect(challengeProgress(song, data({ songs: [mkSong({ id: 's1', status: 'mastered', masteredOn: today })] }), today).current).toBe(1)
})
