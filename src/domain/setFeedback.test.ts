import { describe, expect, test } from 'vitest'
import { challenge, set } from '../test/factories'
import { activeSetChallenge, isNewRecord, meetsChallenge } from './setFeedback'

const weight = challenge({ id: 'w', domain: 'sport', target: { kind: 'weight', programExerciseId: 'a', reps: 8, weightKg: 70, baseline: 65 } })
const reps = challenge({ id: 'r', domain: 'sport', target: { kind: 'reps', programExerciseId: 'b', weightKg: 0, reps: 12, baseline: 10 } })

describe('activeSetChallenge', () => {
  test('défi charge ou reps actif sur l’exo', () => {
    expect(activeSetChallenge([weight, reps], 'a')).toBe(weight)
    expect(activeSetChallenge([weight, reps], 'b')).toBe(reps)
    expect(activeSetChallenge([weight, reps], 'c')).toBeNull()
  })

  test('défi terminé, remplacé, guitare ou par semaine : ignoré', () => {
    expect(
      activeSetChallenge(
        [
          { ...weight, status: 'done' },
          { ...weight, status: 'replaced' },
        ],
        'a',
      ),
    ).toBeNull()
    expect(activeSetChallenge([challenge(), challenge({ domain: 'sport', target: { kind: 'sessionsInWeek', count: 3 } })], 'a')).toBeNull()
  })
})

test('meetsChallenge : charge ≥ et reps ≥', () => {
  const t = activeSetChallenge([weight], 'a')!.target
  expect(meetsChallenge(t, set(70, 8))).toBe(true)
  expect(meetsChallenge(t, set(72.5, 9))).toBe(true)
  expect(meetsChallenge(t, set(70, 7))).toBe(false)
  expect(meetsChallenge(t, set(67.5, 10))).toBe(false)
})

describe('isNewRecord', () => {
  const history = [set(62.5, 8, 'a', 1), set(62.5, 8, 'a', 2)]

  test('bat l’historique', () => {
    expect(isNewRecord(history, [], set(65, 8, 'a', 1))).toBe(true)
    expect(isNewRecord(history, [], set(62.5, 9, 'a', 1))).toBe(true)
    expect(isNewRecord(history, [], set(62.5, 8, 'a', 1))).toBe(false)
  })

  test('pas deux fêtes pour la même série record ; un échauffement record n’éclipse pas la vraie série', () => {
    expect(isNewRecord(history, [set(65, 8, 'a', 1)], set(65, 8, 'a', 2))).toBe(false) // même série refaite
    expect(isNewRecord(history, [set(65, 8, 'a', 1)], set(62.5, 8, 'a', 2))).toBe(false) // moins bien
    expect(isNewRecord(history, [set(60, 8, 'a', 1)], set(65, 8, 'a', 2))).toBe(true)
    expect(isNewRecord(history, [set(40, 30, 'a', 1)], set(65, 8, 'a', 2))).toBe(true) // échauffement léger mais long
  })

  test('premier passage sur l’exo : pas de record', () => {
    expect(isNewRecord([], [], set(65, 8, 'a', 1))).toBe(false)
  })
})
