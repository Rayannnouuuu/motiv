import { addDays, weekStart } from './date'
import { GUITAR_SESSION_MIN } from './streak'
import type { Day, GuitarSession } from './types'

/** Semaine en cours (lundi → dimanche) : minutes de guitare par jour et jours où la séance compte (30 min). */
export function guitarWeek(sessions: GuitarSession[], today: Day): { days: { day: Day; minutes: number }[]; goalDays: number } {
  const start = weekStart(today)
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(start, i)
    return { day, minutes: sessions.filter((s) => s.day === day).reduce((n, s) => n + s.durationMin, 0) }
  })
  return { days, goalDays: days.filter((d) => d.minutes >= GUITAR_SESSION_MIN).length }
}
