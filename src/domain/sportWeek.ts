import { addDays, weekStart } from './date'
import { SPORT_WEEKLY_SESSIONS } from './streak'
import type { Day, SportSession } from './types'

export interface WeekDay {
  day: Day
  sessions: SportSession[]
}

/** Semaine en cours (lundi → dimanche) avec les séances de chaque jour. */
export function sportWeek(sessions: SportSession[], today: Day): { days: WeekDay[]; done: number; remaining: number } {
  const start = weekStart(today)
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(start, i)
    return { day, sessions: sessions.filter((s) => s.day === day) }
  })
  const done = days.reduce((n, d) => n + d.sessions.length, 0)
  return { days, done, remaining: Math.max(0, SPORT_WEEKLY_SESSIONS - done) }
}
