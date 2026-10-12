import { expect, test } from 'vitest'
import { levelUps } from './levelUp'

test('levelUps : seulement les hausses, global en premier', () => {
  expect(levelUps({ global: 1, guitar: 1, sport: 1 }, { global: 1, guitar: 1, sport: 1 })).toEqual([])
  expect(levelUps({ global: 1, guitar: 1, sport: 1 }, { global: 2, guitar: 1, sport: 2 })).toEqual(['global', 'sport'])
  expect(levelUps({ global: 3, guitar: 2, sport: 2 }, { global: 2, guitar: 2, sport: 2 })).toEqual([])
})
