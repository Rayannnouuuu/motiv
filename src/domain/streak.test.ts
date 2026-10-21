import { describe, expect, test } from 'vitest'
import { g, ss } from '../test/factories'
import { guitarToday, weekGoals, weekStreak } from './streak'

// Jeudi 15 oct. 2026 : semaine du 12 au 18.
const today = '2026-10-15'
const guitarWeek = (monday: string, n: number, min = 30) =>
  Array.from({ length: n }, (_, i) => g(`2026-10-${String(Number(monday.slice(8)) + i).padStart(2, '0')}`, min))
const sportWeek = (monday: string, n: number) => Array.from({ length: n }, (_, i) => ss([], `2026-10-${String(Number(monday.slice(8)) + i).padStart(2, '0')}`))

describe('séance de guitare du jour', () => {
  test('compte à 30 min, plusieurs petites séances s’additionnent', () => {
    expect(guitarToday([g(today, 20), g(today, 15)], today)).toEqual({ todayMin: 35, remainingMin: 0 })
    expect(guitarToday([g(today, 29)], today).remainingMin).toBe(1)
  })
  test('plus de règle 30/60 : hier court ne demande pas une heure aujourd’hui', () => {
    expect(guitarToday([g('2026-10-14', 40), g(today, 30)], today).remainingMin).toBe(0)
  })
})

describe('objectifs de la semaine', () => {
  test('jours de guitare à 30 min ou plus, séances de sport ; objectif sport du plan si donné', () => {
    const data = { guitarSessions: [g('2026-10-12', 30), g('2026-10-13', 20), g('2026-10-13', 15), g('2026-10-14', 25)], sportSessions: [ss([], '2026-10-12')] }
    expect(weekGoals(data, today)).toEqual({ guitar: { done: 2, goal: 5 }, sport: { done: 1, goal: 3 } })
    expect(weekGoals(data, today, 6).sport.goal).toBe(6)
  })
})

describe('série de semaines réussies', () => {
  const twoGoodWeeks = { guitarSessions: [...guitarWeek('2026-10-05', 5)], sportSessions: [...sportWeek('2026-10-05', 3)] }

  test('une semaine réussie = les deux objectifs ; la semaine en cours ne casse rien', () => {
    expect(weekStreak(twoGoodWeeks, today)).toEqual({ weeks: 1, best: 1, thisWeekDone: false })
  })

  test('la semaine en cours compte dès qu’elle est réussie', () => {
    const data = {
      guitarSessions: [...twoGoodWeeks.guitarSessions, ...guitarWeek('2026-10-12', 5)],
      sportSessions: [...twoGoodWeeks.sportSessions, ...sportWeek('2026-10-12', 3)],
    }
    expect(weekStreak(data, '2026-10-17')).toEqual({ weeks: 2, best: 2, thisWeekDone: true })
  })

  test('guitare seule ne suffit pas ; l’objectif sport du plan s’applique', () => {
    expect(weekStreak({ guitarSessions: twoGoodWeeks.guitarSessions, sportSessions: [] }, today).weeks).toBe(0)
    expect(weekStreak(twoGoodWeeks, today, () => 4).weeks).toBe(0)
  })
})
