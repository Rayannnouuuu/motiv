import { expect, test } from 'vitest'
import { g, ss } from '../test/factories'
import { bestGuitarStreak, guitarStreak, sportStreak } from './streak'

test('35 + 25 min le même jour = jour valide', () => {
  expect(guitarStreak([g('2026-10-11', 35), g('2026-10-11', 25)], '2026-10-11').days).toBe(1)
})

test('59 min ne comptent pas', () => {
  expect(guitarStreak([g('2026-10-11', 59)], '2026-10-11').days).toBe(0)
})

test("aujourd'hui pas encore fait ne casse pas la série", () => {
  const s = guitarStreak([g('2026-10-09', 60), g('2026-10-10', 60), g('2026-10-11', 20)], '2026-10-11')
  expect(s).toEqual({ days: 2, todayMin: 20, remainingMin: 40 })
})

test('un jour manqué casse la série', () => {
  expect(guitarStreak([g('2026-10-08', 60), g('2026-10-10', 60)], '2026-10-11').days).toBe(1)
})

test("un log daté d'hier répare la série", () => {
  const before = [g('2026-10-09', 60), g('2026-10-11', 60)]
  expect(guitarStreak(before, '2026-10-11').days).toBe(1)
  expect(guitarStreak([...before, g('2026-10-10', 60)], '2026-10-11').days).toBe(3)
})

test('aucune session : série 0, 60 min restantes', () => {
  expect(guitarStreak([], '2026-10-11')).toEqual({ days: 0, todayMin: 0, remainingMin: 60 })
})

test('série sport en semaines de 3 séances, semaine en cours non comptée tant que < 3', () => {
  const sessions = [
    ss([], '2026-09-28'), ss([], '2026-09-30'), ss([], '2026-10-04'),
    ss([], '2026-10-05'), ss([], '2026-10-07'), ss([], '2026-10-09'),
    ss([], '2026-10-12'),
  ]
  expect(sportStreak(sessions, '2026-10-13')).toEqual({ weeks: 2, thisWeekCount: 1 })
})

test('série sport : semaine en cours complète comptée', () => {
  const sessions = [ss([], '2026-10-12'), ss([], '2026-10-13'), ss([], '2026-10-14')]
  expect(sportStreak(sessions, '2026-10-14')).toEqual({ weeks: 1, thisWeekCount: 3 })
})

test('meilleure série : la plus longue suite, même avec un trou au milieu', () => {
  const sessions = [
    g('2026-10-01', 60), g('2026-10-02', 60), g('2026-10-03', 60),
    g('2026-10-05', 60), g('2026-10-06', 60),
  ]
  expect(bestGuitarStreak(sessions)).toBe(3)
})

test('meilleure série : deux logs le même jour sont additionnés', () => {
  expect(bestGuitarStreak([g('2026-10-01', 60), g('2026-10-02', 30), g('2026-10-02', 30), g('2026-10-03', 45)])).toBe(2)
})

test('meilleure série : aucun jour à 60 min, ou aucun historique → 0', () => {
  expect(bestGuitarStreak([g('2026-10-01', 59), g('2026-10-02', 20)])).toBe(0)
  expect(bestGuitarStreak([])).toBe(0)
})
