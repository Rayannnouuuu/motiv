import { expect, test } from 'vitest'
import { g, ss } from '../test/factories'
import { weekGoals } from './weekGoals'

test('semaine du lundi au dimanche : jours de guitare à 30 min ou plus (séances cumulées), séances de sport', () => {
  // Jeudi 15 oct. 2026 : semaine du 12 au 18.
  const guitarSessions = [
    g('2026-10-12', 30),
    g('2026-10-13', 20),
    g('2026-10-13', 15), // 35 min ce jour-là : compte
    g('2026-10-14', 25), // pas assez
    g('2026-10-11', 60), // semaine d'avant
  ]
  const sportSessions = [ss([], '2026-10-12'), ss([], '2026-10-15'), ss([], '2026-10-19')]
  expect(weekGoals({ guitarSessions, sportSessions }, '2026-10-15')).toEqual({ guitar: { done: 2, goal: 5 }, sport: { done: 2, goal: 3 } })
})
