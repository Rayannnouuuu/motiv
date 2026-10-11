import { expect, test } from 'vitest'
import { getExercise } from '../content/exercises'
import { ex, gs, set, ss } from '../test/factories'
import { bestBpm, isSportRecord, maxDifficultyByCategory, setsForExercise } from './records'

test('isSportRecord : aucune série précédente ne domine (charge ≥ et reps ≥)', () => {
  const prev = [set(60, 8), set(65, 5)]
  expect(isSportRecord(prev, set(62.5, 8))).toBe(true) // plus lourd à 8 reps
  expect(isSportRecord(prev, set(60, 9))).toBe(true) // plus de reps à 60
  expect(isSportRecord(prev, set(60, 8))).toBe(false) // égalité
  expect(isSportRecord(prev, set(62.5, 5))).toBe(false) // dominée par 65×5
  expect(isSportRecord([], set(60, 8))).toBe(false) // première série
})

test('bestBpm prend le max, ignore les tempos vides', () => {
  const s = [gs([ex('legato-4', 90)]), gs([ex('legato-4', 104), ex('legato-4', null)])]
  expect(bestBpm(s, 'legato-4')).toBe(104)
  expect(bestBpm(s, 'picking-1')).toBeNull()
})

test('bestBpm et maxDifficultyByCategory ignorent les exos inconnus', () => {
  const s = [gs([ex('legato-4', 100), ex('ghost-1', 300)])]
  expect(bestBpm(s, 'ghost-1')).toBe(300)
  expect(maxDifficultyByCategory(s)).toEqual({ legato: getExercise('legato-4')!.difficulty })
})

test('setsForExercise rassemble les séries de toutes les séances', () => {
  const s = [ss([set(60, 8, 'a'), set(30, 10, 'b')]), ss([set(62.5, 8, 'a')])]
  expect(setsForExercise(s, 'a')).toEqual([set(60, 8, 'a'), set(62.5, 8, 'a')])
})
