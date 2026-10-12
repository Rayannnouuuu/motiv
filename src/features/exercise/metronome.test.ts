import { expect, test } from 'vitest'
import { EXERCISES, getExercise } from '../../content/exercises'
import { clampBpm, clickKind, MAX_BPM, MIN_BPM, resubdivide, schedule, startBpm, subdivisionOf } from './metronome'

test('subdivision du motif : croches pour rhythm-9, noires pour scales-1', () => {
  expect(subdivisionOf(getExercise('rhythm-9')!.pattern)).toBe(2)
  expect(subdivisionOf(getExercise('scales-1')!.pattern)).toBe(1)
  expect(subdivisionOf([{ string: 1, fret: 0, startBeat: 1 / 3, duration: 1 / 3 }])).toBe(3)
  expect(subdivisionOf([{ string: 1, fret: 0, startBeat: 0.25, duration: 0.25 }])).toBe(4)
  expect(subdivisionOf([{ string: 1, fret: 0, startBeat: 0.2, duration: 0.2 }])).toBe(4)
})

test('tout le contenu tombe sur des noires ou des croches', () => {
  for (const e of EXERCISES) expect([1, 2]).toContain(subdivisionOf(e.pattern))
})

test('tempo de départ : record, sinon 70 % de la cible arrondi pair', () => {
  expect(startBpm(null, 66)).toBe(46)
  expect(startBpm(76, 102)).toBe(76)
  expect(startBpm(null, 20)).toBe(MIN_BPM)
  expect(startBpm(400, 102)).toBe(MAX_BPM)
})

test('bornes du tempo', () => {
  expect(clampBpm(12)).toBe(30)
  expect(clampBpm(300)).toBe(260)
  expect(clampBpm(90.6)).toBe(91)
})

test('type de clic : premier temps, temps, subdivision', () => {
  expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => clickKind(i, 2))).toEqual(['bar', 'sub', 'beat', 'sub', 'beat', 'sub', 'beat', 'sub', 'bar'])
  expect([0, 1, 4].map((i) => clickKind(i, 1))).toEqual(['bar', 'beat', 'bar'])
  expect(clickKind(3, 1, 3)).toBe('bar')
})

test('2 s à 60 bpm en croches = 4 clics', () => {
  const { clicks, next } = schedule({ nextTime: 0, index: 0 }, 0, 2, 60, 2)
  expect(clicks).toEqual([
    { time: 0, kind: 'bar', index: 0 },
    { time: 0.5, kind: 'sub', index: 1 },
    { time: 1, kind: 'beat', index: 2 },
    { time: 1.5, kind: 'sub', index: 3 },
  ])
  expect(next).toEqual({ nextTime: 2, index: 4 })
})

test('rien à programmer tant que le prochain clic est loin', () => {
  expect(schedule({ nextTime: 1, index: 3 }, 0, 0.1, 60, 1)).toEqual({ clicks: [], next: { nextTime: 1, index: 3 } })
})

test('changement de tempo en cours de lecture : pas de saut, nouvel écart dès le clic suivant', () => {
  const a = schedule({ nextTime: 0, index: 0 }, 0, 1.1, 60, 1)
  expect(a.clicks.map((c) => c.time)).toEqual([0, 1])
  const b = schedule(a.next, 1.95, 1.1, 120, 1)
  expect(b.clicks.map((c) => [c.time, c.index])).toEqual([
    [2, 2],
    [2.5, 3],
    [3, 4],
  ])
  expect(b.clicks.map((c) => c.kind)).toEqual(['beat', 'beat', 'bar'])
})

test('changement de subdivision en cours de lecture : même position dans la mesure', () => {
  // Croches → noires, au milieu du 3e temps : on attend le 4e temps.
  expect(resubdivide({ nextTime: 10, index: 5 }, 2, 1, 60)).toEqual({ nextTime: 10.5, index: 3 })
  // Noires → croches, sur un temps : même instant.
  expect(resubdivide({ nextTime: 10, index: 3 }, 1, 2, 60)).toEqual({ nextTime: 10, index: 6 })
})
