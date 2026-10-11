import { expect, test } from 'vitest'
import { presetToPrograms, SPORT_PRESETS } from './sportPresets'

test('Full body, Haut/Bas et Push/Pull/Legs', () => {
  expect(SPORT_PRESETS.map((p) => p.sessions.map((s) => s.name))).toEqual([
    ['Full body A', 'Full body B'],
    ['Haut', 'Bas'],
    ['Push', 'Pull', 'Legs'],
  ])
})

test('presetToPrograms : ids, positions, exos rattachés', () => {
  let n = 0
  const programs = presetToPrograms(SPORT_PRESETS.find((p) => p.id === 'push-pull-legs')!, 5, () => `id${n++}`)
  expect(programs.map((p) => [p.name, p.position])).toEqual([
    ['Push', 5],
    ['Pull', 6],
    ['Legs', 7],
  ])
  expect(programs[0].exercises[0]).toEqual({
    id: 'id1',
    programId: 'id0',
    name: 'Développé couché',
    targetSets: 4,
    targetReps: 8,
    position: 0,
    archived: false,
  })
  expect(new Set(programs.flatMap((p) => [p.id, ...p.exercises.map((e) => e.id)])).size).toBe(n)
})
