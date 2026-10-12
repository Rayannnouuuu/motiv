import { addDays, weekStart } from './date'
import type { Day, GuitarSession, SportSession } from './types'

export const GUITAR_DAILY_MIN = 60
export const SPORT_WEEKLY_SESSIONS = 3

export function guitarStreak(
  sessions: GuitarSession[],
  today: Day,
): { days: number; todayMin: number; remainingMin: number } {
  const minutes = new Map<Day, number>()
  for (const s of sessions) minutes.set(s.day, (minutes.get(s.day) ?? 0) + s.durationMin)
  const counts = (d: Day) => (minutes.get(d) ?? 0) >= GUITAR_DAILY_MIN

  const todayMin = minutes.get(today) ?? 0
  let day = counts(today) ? today : addDays(today, -1)
  let days = 0
  while (counts(day)) {
    days++
    day = addDays(day, -1)
  }
  return { days, todayMin, remainingMin: Math.max(0, GUITAR_DAILY_MIN - todayMin) }
}

/** Plus longue suite de jours consécutifs à ≥ 60 min de guitare (0 sans historique). */
export function bestGuitarStreak(sessions: GuitarSession[]): number {
  const minutes = new Map<Day, number>()
  for (const s of sessions) minutes.set(s.day, (minutes.get(s.day) ?? 0) + s.durationMin)
  const days = [...minutes].filter(([, m]) => m >= GUITAR_DAILY_MIN).map(([d]) => d).sort()
  let best = 0
  let run = 0
  days.forEach((d, i) => {
    run = i > 0 && addDays(days[i - 1], 1) === d ? run + 1 : 1
    best = Math.max(best, run)
  })
  return best
}

export function sportStreak(sessions: SportSession[], today: Day): { weeks: number; thisWeekCount: number } {
  const perWeek = new Map<Day, number>()
  for (const s of sessions) {
    const w = weekStart(s.day)
    perWeek.set(w, (perWeek.get(w) ?? 0) + 1)
  }
  const counts = (w: Day) => (perWeek.get(w) ?? 0) >= SPORT_WEEKLY_SESSIONS

  const thisWeek = weekStart(today)
  let week = counts(thisWeek) ? thisWeek : addDays(thisWeek, -7)
  let weeks = 0
  while (counts(week)) {
    weeks++
    week = addDays(week, -7)
  }
  return { weeks, thisWeekCount: perWeek.get(thisWeek) ?? 0 }
}
