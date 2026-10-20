import { addDays, weekStart } from './date'
import { GUITAR_SHORT_MIN, SPORT_WEEKLY_SESSIONS } from './streak'
import type { AppData, Day } from './types'

export const GUITAR_WEEKLY_SESSIONS = 5

/**
 * Objectifs de la semaine (audit, question 3) : 5 séances de guitare d'au moins 30 min (un jour où le total
 * atteint 30 min compte pour une) et 3 séances de sport, du lundi au dimanche.
 */
export function weekGoals(data: Pick<AppData, 'guitarSessions' | 'sportSessions'>, today: Day) {
  const start = weekStart(today)
  const end = addDays(start, 6)
  const inWeek = (d: Day) => d >= start && d <= end
  const minutes = new Map<Day, number>()
  for (const s of data.guitarSessions) if (inWeek(s.day)) minutes.set(s.day, (minutes.get(s.day) ?? 0) + s.durationMin)
  return {
    guitar: { done: [...minutes.values()].filter((m) => m >= GUITAR_SHORT_MIN).length, goal: GUITAR_WEEKLY_SESSIONS },
    sport: { done: data.sportSessions.filter((s) => inWeek(s.day)).length, goal: SPORT_WEEKLY_SESSIONS },
  }
}
