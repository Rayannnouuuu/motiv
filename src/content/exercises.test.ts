import { expect, test } from 'vitest'
import { CATEGORY_LABELS, EXERCISES, getExercise, nextInCategory, type TabNote } from './exercises'

const TECHNIQUES = ['hammer', 'pull', 'bend', 'palmMute']

/** Corde 1 (mi aigu) à 6 (mi grave), frette 0 (à vide) ou plus. */
const validNote = (n: TabNote) =>
  Number.isInteger(n.string) &&
  n.string >= 1 &&
  n.string <= 6 &&
  Number.isInteger(n.fret) &&
  n.fret >= 0 &&
  n.duration > 0 &&
  (n.technique === undefined || TECHNIQUES.includes(n.technique))

const LEGACY = EXERCISES.filter((e) => e.source === 'legacy')
const NEW = EXERCISES.filter((e) => e.source === 'new')

test('100 exercices repris + la base du lot G1, ids uniques, 12 catégories', () => {
  expect(LEGACY).toHaveLength(100)
  expect(NEW.length).toBeGreaterThanOrEqual(120)
  expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length)
  expect(new Set(EXERCISES.map((e) => e.category)).size).toBe(12)
  expect(EXERCISES.filter((e) => !(e.category in CATEGORY_LABELS)).map((e) => e.id)).toEqual([])
})

test('titres uniques, et le numéro d’un titre est le niveau de l’exo', () => {
  expect(new Set(EXERCISES.map((e) => e.title)).size).toBe(EXERCISES.length)
  const wrong = EXERCISES.filter((e) => Number(/ (\d+)(?:,|$)/.exec(e.title)?.[1]) !== e.difficulty).map((e) => e.title)
  expect(wrong).toEqual([])
})

test('chaque exo a exactement les champs attendus ; les nouveaux sont marqués « à relire »', () => {
  const keys = ['category', 'description', 'difficulty', 'id', 'metric', 'pattern', 'source', 'startBpm', 'targetBpm', 'title']
  expect(LEGACY.filter((e) => Object.keys(e).sort().join() !== keys.join()).map((e) => e.id)).toEqual([])
  expect(NEW.filter((e) => Object.keys(e).sort().join() !== [...keys, 'review'].sort().join() || e.review !== true).map((e) => e.id)).toEqual([])
})

test('mesuré en bpm, tempo de départ entre 0 et la cible', () => {
  expect(EXERCISES.filter((e) => e.metric !== 'bpm' || !['legacy', 'new'].includes(e.source)).map((e) => e.id)).toEqual([])
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

test('base G1 jouable : frettes ≤ 22, notes d’un même instant sur des cordes différentes et à 5 cases au plus', () => {
  const bad = NEW.filter((e) => {
    const at = new Map<number, TabNote[]>()
    for (const n of e.pattern) at.set(n.startBeat, [...(at.get(n.startBeat) ?? []), n])
    return (
      e.pattern.some((n) => n.fret > 22) ||
      [...at.values()].some((notes) => {
        const fretted = notes.filter((n) => n.fret > 0).map((n) => n.fret)
        return new Set(notes.map((n) => n.string)).size !== notes.length || (fretted.length > 0 && Math.max(...fretted) - Math.min(...fretted) > 4)
      })
    )
  })
  expect(bad.map((e) => e.id)).toEqual([])
})

test('liés (hammer, pull) : sur la même corde que la note d’avant, plus aigu pour un hammer, plus grave pour un pull', () => {
  const bad = NEW.filter((e) =>
    e.pattern.some((n, i) => {
      if (n.technique !== 'hammer' && n.technique !== 'pull') return false
      const prev = e.pattern[i - 1]
      return !prev || prev.string !== n.string || (n.technique === 'hammer' ? n.fret <= prev.fret : n.fret >= prev.fret)
    }),
  )
  expect(bad.map((e) => e.id)).toEqual([])
})
