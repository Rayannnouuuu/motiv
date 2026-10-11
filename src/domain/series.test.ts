import { expect, test } from 'vitest'
import { ex, g, mkSong, set, ss } from '../test/factories'
import {
  bodySeries,
  guitarHoursSeries,
  masteredSongsSeries,
  recordsOf,
  tempoSeries,
  weightSeries,
  windowPoints,
  type Point,
} from './series'

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
  const s = [g('2026-10-01', 30, [ex('legato-4', 80)]), g('2026-10-03', 30, [ex('legato-4', 76)]), g('2026-10-05', 30, [ex('legato-4', 84), ex('picking-1', 60)])]
  expect(tempoSeries(s, 'legato-4')).toEqual([p('2026-10-01', 80), p('2026-10-03', 80), p('2026-10-05', 84)])
})

test('charge max cumulée', () => {
  const s = [ss([set(60, 8, 'a'), set(62.5, 5, 'a')], '2026-10-01'), ss([set(60, 8, 'a')], '2026-10-04')]
  expect(weightSeries(s, 'a')).toEqual([p('2026-10-01', 62.5), p('2026-10-04', 62.5)])
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
