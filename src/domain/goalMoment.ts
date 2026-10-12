import { addDays, weekStart } from './date'
import { GUITAR_DAILY_MIN, SPORT_WEEKLY_SESSIONS, guitarStreak, sportStreak } from './streak'
import type { Day, GuitarSession, SportSession } from './types'

/** Paliers fêtés en grand : jours de série guitare, semaines de sport d'affilée. */
export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 150, 200, 365]
export const WEEK_MILESTONES = [4, 8, 12, 26, 52]

/** Ce que le log qu'on vient d'enregistrer change aux deux vrais objectifs (60 min par jour, 3 séances par semaine). */
export type GoalMoment =
  | { kind: 'streakKept'; days: number; milestone: boolean }
  | { kind: 'streakRepaired'; days: number; milestone: boolean }
  | { kind: 'guitarRemaining'; beforeMin: number; todayMin: number; remainingMin: number; days: number }
  | { kind: 'guitarBonus'; days: number }
  | { kind: 'weekDone'; weeks: number; milestone: boolean }
  | { kind: 'weekProgress'; done: number; remaining: number }
  | { kind: 'weekBonus'; done: number }

const minutesOn = (sessions: GuitarSession[], day: Day) => sessions.reduce((n, s) => (s.day === day ? n + s.durationMin : n), 0)

/** Moment guitare du log `logId` : série tenue, réparée, minutes restantes ou bonus. null si rien à dire. */
export function guitarMoment(sessions: GuitarSession[], logId: string, today: Day): GoalMoment | null {
  const log = sessions.find((s) => s.id === logId)
  if (!log) return null
  const before = sessions.filter((s) => s.id !== logId)

  if (log.day === today) {
    const beforeMin = minutesOn(before, today)
    const todayMin = minutesOn(sessions, today)
    // Compte aujourd'hui s'il est validé ; sinon c'est la série jusqu'à hier, celle qu'il reste à garder.
    const days = guitarStreak(sessions, today).days
    if (beforeMin >= GUITAR_DAILY_MIN) return { kind: 'guitarBonus', days }
    if (todayMin >= GUITAR_DAILY_MIN) return { kind: 'streakKept', days, milestone: STREAK_MILESTONES.includes(days) }
    return { kind: 'guitarRemaining', beforeMin, todayMin, remainingMin: GUITAR_DAILY_MIN - todayMin, days }
  }

  const yesterday = addDays(today, -1)
  if (log.day === yesterday && minutesOn(before, yesterday) < GUITAR_DAILY_MIN && minutesOn(sessions, yesterday) >= GUITAR_DAILY_MIN) {
    const days = guitarStreak(sessions, today).days
    if (days > guitarStreak(before, today).days) return { kind: 'streakRepaired', days, milestone: STREAK_MILESTONES.includes(days) }
  }
  return null
}

/** Moment sport du log `logId` : semaine validée, séances restantes ou bonus. null si le log n'est pas de cette semaine. */
export function sportMoment(sessions: SportSession[], logId: string, today: Day): GoalMoment | null {
  const log = sessions.find((s) => s.id === logId)
  if (!log) return null
  const week = weekStart(today)
  if (weekStart(log.day) !== week) return null

  const inWeek = (s: SportSession) => weekStart(s.day) === week
  const doneBefore = sessions.filter((s) => s.id !== logId && inWeek(s)).length
  const done = sessions.filter(inWeek).length
  if (doneBefore < SPORT_WEEKLY_SESSIONS && done >= SPORT_WEEKLY_SESSIONS) {
    const weeks = sportStreak(sessions, today).weeks
    return { kind: 'weekDone', weeks, milestone: WEEK_MILESTONES.includes(weeks) }
  }
  if (done < SPORT_WEEKLY_SESSIONS) return { kind: 'weekProgress', done, remaining: SPORT_WEEKLY_SESSIONS - done }
  return { kind: 'weekBonus', done }
}
