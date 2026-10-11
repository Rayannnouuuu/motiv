import { expect, test } from 'vitest'
import { EXERCISES, getExercise, nextInCategory } from './exercises'

test('100 exercices, ids uniques, 8 catégories', () => {
  expect(EXERCISES).toHaveLength(100)
  expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(100)
  expect(new Set(EXERCISES.map((e) => e.category)).size).toBe(8)
})

test('getExercise', () => {
  expect(getExercise('legato-4')?.category).toBe('legato')
  expect(getExercise('nope')).toBeUndefined()
})

test('nextInCategory renvoie difficulté + 1 dans la même catégorie', () => {
  const base = getExercise('scales-1')!
  const next = nextInCategory(base)!
  expect(next.category).toBe('scales')
  expect(next.difficulty).toBe(base.difficulty + 1)
})

test('nextInCategory renvoie undefined à la difficulté 10', () => {
  const top = EXERCISES.find((e) => e.category === 'sweep' && e.difficulty === 10)!
  expect(nextInCategory(top)).toBeUndefined()
})

test('ne garde que les champs utiles', () => {
  expect(Object.keys(getExercise('scales-1')!).sort()).toEqual(
    ['category', 'description', 'difficulty', 'id', 'pattern', 'targetBpm', 'title'],
  )
})
