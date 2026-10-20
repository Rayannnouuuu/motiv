import { addDays, weekStart } from './date'
import type { Day, GuitarSession, SportSession } from './types'

/**
 * Série guitare : un jour compte à partir de 30 min, mais deux jours courts (moins de 60 min) d'affilée
 * la cassent. Il faut donc au moins une heure un jour sur deux.
 */
export const GUITAR_SHORT_MIN = 30
export const GUITAR_DAILY_MIN = 60
export const SPORT_WEEKLY_SESSIONS = 3

function minutesByDay(sessions: GuitarSession[]): Map<Day, number> {
  const minutes = new Map<Day, number>()
  for (const s of sessions) minutes.set(s.day, (minutes.get(s.day) ?? 0) + s.durationMin)
  return minutes
}

const isShort = (m: number) => m >= GUITAR_SHORT_MIN && m < GUITAR_DAILY_MIN

/**
 * `targetMin` : ce qu'il faut aujourd'hui pour tenir la série (60 si hier était un jour court, sinon 30).
 * `days` compte aujourd'hui seulement s'il atteint déjà ce minimum.
 */
export function guitarStreak(sessions: GuitarSession[], today: Day): { days: number; todayMin: number; remainingMin: number; targetMin: number } {
  const minutes = minutesByDay(sessions)
  const m = (d: Day) => minutes.get(d) ?? 0
  const todayMin = m(today)
  const targetMin = isShort(m(addDays(today, -1))) ? GUITAR_DAILY_MIN : GUITAR_SHORT_MIN

  let day = todayMin >= targetMin ? today : addDays(today, -1)
  let days = 0
  let laterShort = false
  while (m(day) >= GUITAR_SHORT_MIN && !(laterShort && isShort(m(day)))) {
    days++
    laterShort = isShort(m(day))
    day = addDays(day, -1)
  }
  return { days, todayMin, remainingMin: Math.max(0, targetMin - todayMin), targetMin }
}

/** Plus longue série guitare, mêmes règles (0 sans historique). */
export function bestGuitarStreak(sessions: GuitarSession[]): number {
  const days = [...minutesByDay(sessions)].filter(([, m]) => m >= GUITAR_SHORT_MIN).sort(([a], [b]) => a.localeCompare(b))
  let best = 0
  let run = 0
  days.forEach(([d, m], i) => {
    const [prevDay, prevMin] = days[i - 1] ?? []
    const continues = prevDay !== undefined && addDays(prevDay, 1) === d && !(isShort(m) && isShort(prevMin!))
    run = continues ? run + 1 : 1
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
