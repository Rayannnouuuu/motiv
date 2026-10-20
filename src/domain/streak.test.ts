import { expect, test } from 'vitest'
import { g, ss } from '../test/factories'
import { bestGuitarStreak, guitarStreak, sportStreak } from './streak'

test('35 + 25 min le même jour = jour valide', () => {
  expect(guitarStreak([g('2026-10-11', 35), g('2026-10-11', 25)], '2026-10-11').days).toBe(1)
})

test('29 min ne comptent pas ; 30 min comptent', () => {
  expect(guitarStreak([g('2026-10-11', 29)], '2026-10-11').days).toBe(0)
  expect(guitarStreak([g('2026-10-11', 30)], '2026-10-11').days).toBe(1)
})

test('deux jours courts (30 à 59 min) d’affilée cassent la série', () => {
  // 60 · 40 · 40 : la série repart du dernier jour court.
  expect(guitarStreak([g('2026-10-09', 60), g('2026-10-10', 40), g('2026-10-11', 40)], '2026-10-12').days).toBe(1)
  // 40 · 60 · 40 · 60 : un jour court entre deux heures, la série tient.
  const alt = [g('2026-10-08', 40), g('2026-10-09', 60), g('2026-10-10', 40), g('2026-10-11', 60)]
  expect(guitarStreak(alt, '2026-10-11').days).toBe(4)
})

test('après un jour court, il faut 60 min aujourd’hui', () => {
  const s = guitarStreak([g('2026-10-09', 60), g('2026-10-10', 40), g('2026-10-11', 45)], '2026-10-11')
  // 45 ne suffit pas aujourd'hui : la série comptée s'arrête hier, il manque 15 min.
  expect(s).toEqual({ days: 2, todayMin: 45, remainingMin: 15, targetMin: 60 })
})

test("aujourd'hui pas encore fait ne casse pas la série", () => {
  const s = guitarStreak([g('2026-10-09', 60), g('2026-10-10', 60), g('2026-10-11', 20)], '2026-10-11')
  expect(s).toEqual({ days: 2, todayMin: 20, remainingMin: 10, targetMin: 30 })
})

test('un jour manqué casse la série', () => {
  expect(guitarStreak([g('2026-10-08', 60), g('2026-10-10', 60)], '2026-10-11').days).toBe(1)
})

test("un log daté d'hier répare la série", () => {
  const before = [g('2026-10-09', 60), g('2026-10-11', 60)]
  expect(guitarStreak(before, '2026-10-11').days).toBe(1)
  expect(guitarStreak([...before, g('2026-10-10', 60)], '2026-10-11').days).toBe(3)
})

test('aucune session : série 0, 30 min restantes', () => {
  expect(guitarStreak([], '2026-10-11')).toEqual({ days: 0, todayMin: 0, remainingMin: 30, targetMin: 30 })
})

test('série sport en semaines de 3 séances, semaine en cours non comptée tant que < 3', () => {
  const sessions = [
    ss([], '2026-09-28'),
    ss([], '2026-09-30'),
    ss([], '2026-10-04'),
    ss([], '2026-10-05'),
    ss([], '2026-10-07'),
    ss([], '2026-10-09'),
    ss([], '2026-10-12'),
  ]
  expect(sportStreak(sessions, '2026-10-13')).toEqual({ weeks: 2, thisWeekCount: 1 })
})

test('série sport : semaine en cours complète comptée', () => {
  const sessions = [ss([], '2026-10-12'), ss([], '2026-10-13'), ss([], '2026-10-14')]
  expect(sportStreak(sessions, '2026-10-14')).toEqual({ weeks: 1, thisWeekCount: 3 })
})

test('meilleure série : la plus longue suite, même avec un trou au milieu', () => {
  const sessions = [g('2026-10-01', 60), g('2026-10-02', 60), g('2026-10-03', 60), g('2026-10-05', 60), g('2026-10-06', 60)]
  expect(bestGuitarStreak(sessions)).toBe(3)
})

test('meilleure série : deux logs le même jour sont additionnés ; deux jours courts d’affilée la coupent', () => {
  // 60 · (30+30) · 45 · 45 : les deux 45 se suivent, la suite s'arrête à 3.
  expect(bestGuitarStreak([g('2026-10-01', 60), g('2026-10-02', 30), g('2026-10-02', 30), g('2026-10-03', 45), g('2026-10-04', 45)])).toBe(3)
})

test('meilleure série : aucun jour à 30 min, ou aucun historique → 0', () => {
  expect(bestGuitarStreak([g('2026-10-01', 29), g('2026-10-02', 20)])).toBe(0)
  expect(bestGuitarStreak([])).toBe(0)
})
