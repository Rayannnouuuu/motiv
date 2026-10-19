import { expect, test } from 'vitest'
import { CATEGORY_LABELS, EXERCISES, getExercise, nextInCategory, type TabNote } from './exercises'

const TECHNIQUES = ['hammer', 'bend', 'palmMute']

/** Corde 1 (mi aigu) à 6 (mi grave), frette 0 (à vide) ou plus. */
const validNote = (n: TabNote) =>
  Number.isInteger(n.string) &&
  n.string >= 1 &&
  n.string <= 6 &&
  Number.isInteger(n.fret) &&
  n.fret >= 0 &&
  n.duration > 0 &&
  (n.technique === undefined || TECHNIQUES.includes(n.technique))

test('100 exercices, ids uniques, 8 catégories', () => {
  expect(EXERCISES).toHaveLength(100)
  expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(100)
  expect(new Set(EXERCISES.map((e) => e.category)).size).toBe(8)
  expect(EXERCISES.filter((e) => !(e.category in CATEGORY_LABELS)).map((e) => e.id)).toEqual([])
})

test('titres uniques, et le numéro d’un titre est le niveau de l’exo', () => {
  expect(new Set(EXERCISES.map((e) => e.title)).size).toBe(100)
  const wrong = EXERCISES.filter((e) => Number(/ (\d+)(?:,|$)/.exec(e.title)?.[1]) !== e.difficulty).map((e) => e.title)
  expect(wrong).toEqual([])
})

test('chaque exo a exactement les champs attendus (plus de xpReward)', () => {
  const keys = ['category', 'description', 'difficulty', 'id', 'metric', 'pattern', 'source', 'startBpm', 'targetBpm', 'title']
  expect(EXERCISES.filter((e) => Object.keys(e).sort().join() !== keys.join()).map((e) => e.id)).toEqual([])
})

test('mesuré en bpm, tempo de départ entre 0 et la cible, base reprise de l’ancien site', () => {
  expect(EXERCISES.filter((e) => e.metric !== 'bpm' || e.source !== 'legacy').map((e) => e.id)).toEqual([])
  expect(EXERCISES.filter((e) => !(e.startBpm > 0 && e.startBpm <= e.targetBpm)).map((e) => e.id)).toEqual([])
})

test('tablatures valides : cordes 1 à 6, frettes ≥ 0, techniques connues', () => {
  expect(EXERCISES.filter((e) => e.pattern.length === 0 || !e.pattern.every(validNote)).map((e) => e.id)).toEqual([])
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
