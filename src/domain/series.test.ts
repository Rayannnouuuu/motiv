import { expect, test } from 'vitest'
import { ex, g, mkSong, set, ss } from '../test/factories'
import { bodySeries, e1rm, guitarHoursSeries, masteredSongsSeries, recordsOf, strengthSeries, tempoSeries, windowPoints, type Point } from './series'

const p = (day: string, value: number): Point => ({ day, value })

test('heures cumulées avec point zéro', () => {
  expect(guitarHoursSeries([g('2026-10-10', 60), g('2026-10-10', 30), g('2026-10-11', 90)])).toEqual([
    p('2026-10-09', 0),
    p('2026-10-10', 1.5),
    p('2026-10-11', 3),
  ])
  expect(guitarHoursSeries([])).toEqual([])
})

test('morceaux maîtrisés cumulés', () => {
  const songs = [mkSong({ status: 'mastered', masteredOn: '2026-10-05' }), mkSong(), mkSong({ status: 'mastered', masteredOn: '2026-10-09' })]
  expect(masteredSongsSeries(songs)).toEqual([p('2026-10-04', 0), p('2026-10-05', 1), p('2026-10-09', 2)])
})

test('tempo : meilleur cumulé par jour loggé', () => {
  const s = [
    g('2026-10-01', 30, [ex('legato-4', 80)]),
    g('2026-10-03', 30, [ex('legato-4', 76)]),
    g('2026-10-05', 30, [ex('legato-4', 84), ex('picking-1', 60)]),
  ]
  expect(tempoSeries(s, 'legato-4')).toEqual([p('2026-10-01', 80), p('2026-10-03', 80), p('2026-10-05', 84)])
})

test('e1rm : Epley au 0,1 kg, sans plafond de reps', () => {
  expect(e1rm(65, 8)).toBe(82.3)
  expect(e1rm(62.5, 8)).toBe(79.2)
  expect(e1rm(62.5, 10)).toBe(83.3)
  // Chaque rep en plus compte, même au-delà de 12 (curl à 10 kg : 12 → 13 → 14 reps).
  expect(e1rm(10, 13)).toBeGreaterThan(e1rm(10, 12))
  expect(e1rm(10, 14)).toBeGreaterThan(e1rm(10, 13))
})

test('force : plus de reps à la même charge fait monter la courbe', () => {
  const s = [ss([set(62.5, 8, 'a')], '2026-10-01'), ss([set(62.5, 10, 'a')], '2026-10-04')]
  const r = strengthSeries(s, 'a')
  expect(r.unit).toBe('kg')
  expect(r.points).toEqual([p('2026-10-01', 79.2), p('2026-10-04', 83.3)])
  expect(r.best.get('2026-10-04')).toEqual(set(62.5, 10, 'a'))
})

test('force : max courant, la meilleure série du jour et celle qui tient le record', () => {
  const best = set(65, 8, 'a')
  const s = [ss([set(60, 8, 'a'), best, set(70, 1, 'b')], '2026-10-01'), ss([set(60, 8, 'a')], '2026-10-04')]
  const r = strengthSeries(s, 'a')
  expect(r.points).toEqual([p('2026-10-01', 82.3), p('2026-10-04', 82.3)])
  expect(r.best.get('2026-10-01')).toBe(best)
  expect(r.best.get('2026-10-04')).toBe(best)
})

test('force au poids du corps : max de reps', () => {
  const s = [ss([set(0, 8, 'dips')], '2026-10-01'), ss([set(0, 10, 'dips'), set(0, 7, 'dips')], '2026-10-04')]
  const r = strengthSeries(s, 'dips')
  expect(r.unit).toBe('reps')
  expect(r.points).toEqual([p('2026-10-01', 8), p('2026-10-04', 10)])
  expect(r.best.get('2026-10-04')).toEqual(set(0, 10, 'dips'))
})

test('force : un échauffement à 0 kg est ignoré quand il y a des séries chargées', () => {
  const s = [ss([set(0, 15, 'a')], '2026-09-28'), ss([set(0, 20, 'a'), set(60, 5, 'a')], '2026-10-01')]
  const r = strengthSeries(s, 'a')
  expect(r.unit).toBe('kg')
  expect(r.points).toEqual([p('2026-10-01', 70)])
  expect([...r.best.keys()]).toEqual(['2026-10-01'])
})

test('force : aucune série → courbe vide', () => {
  expect(strengthSeries([ss([set(60, 8, 'b')])], 'a')).toEqual({ unit: 'reps', points: [], best: new Map() })
})

test('mesures : valeurs non nulles', () => {
  const m = [
    { id: '1', day: '2026-10-01', weightKg: 78, waistCm: null, chestCm: null, armCm: null, thighCm: null },
    { id: '2', day: '2026-10-08', weightKg: null, waistCm: 82, chestCm: null, armCm: null, thighCm: null },
    { id: '3', day: '2026-10-15', weightKg: 77.4, waistCm: null, chestCm: null, armCm: null, thighCm: null },
  ]
  expect(bodySeries(m, 'weightKg')).toEqual([p('2026-10-01', 78), p('2026-10-15', 77.4)])
})

test('windowPoints : delta = dernier − dernier point avant la fenêtre', () => {
  const pts = [p('2026-06-01', 10), p('2026-09-20', 30), p('2026-10-10', 41)]
  const w = windowPoints(pts, '2026-10-15', 30) // fenêtre à partir du 2026-09-16
  expect(w.current).toBe(41)
  expect(w.delta).toBe(31)
  expect(w.points).toEqual([p('2026-09-16', 10), p('2026-09-20', 30), p('2026-10-10', 41)])
})

test('windowPoints : sans point avant la fenêtre, delta depuis le premier point de la fenêtre', () => {
  expect(windowPoints([p('2026-10-01', 80), p('2026-10-10', 90)], '2026-10-15', 30).delta).toBe(10)
})

test('windowPoints : 0 point → null ; 1 point → delta 0', () => {
  expect(windowPoints([], '2026-10-15', 90)).toEqual({ points: [], current: null, delta: null })
  expect(windowPoints([p('2026-10-01', 80)], '2026-10-15', 90)).toEqual({ points: [p('2026-10-01', 80)], current: 80, delta: 0 })
})

test('recordsOf', () => {
  expect(recordsOf([p('a', 90), p('b', 90), p('c', 96)])).toEqual([p('a', 90), p('c', 96)])
})
