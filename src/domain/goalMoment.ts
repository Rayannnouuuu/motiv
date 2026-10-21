import { weekStart } from './date'
import { GUITAR_SESSION_MIN, GUITAR_WEEKLY_SESSIONS, SPORT_WEEKLY_SESSIONS, weekGoals } from './streak'
import type { Day, GuitarSession, SportSession } from './types'

/** Paliers fêtés en grand : semaines réussies d'affilée. */
export const WEEK_MILESTONES = [4, 8, 12, 26, 52]

/** Ce que le log qu'on vient d'enregistrer change aux objectifs de la semaine (lot 4). */
export type GoalMoment =
  | { kind: 'guitarRemaining'; beforeMin: number; todayMin: number; remainingMin: number }
  | { kind: 'guitarCounted'; done: number; goal: number }
  | { kind: 'guitarBonus'; done: number; goal: number }
  | { kind: 'weekDone'; discipline: 'guitar' | 'sport'; done: number }
  | { kind: 'weekProgress'; done: number; remaining: number; goal: number }
  | { kind: 'weekBonus'; done: number }

const minutesOn = (sessions: GuitarSession[], day: Day) => sessions.reduce((n, s) => (s.day === day ? n + s.durationMin : n), 0)

/** Moment guitare du log `logId` : séance du jour comptée, objectif de la semaine tenu, ou minutes qui manquent. */
export function guitarMoment(sessions: GuitarSession[], logId: string, today: Day): GoalMoment | null {
  const log = sessions.find((s) => s.id === logId)
  if (!log || weekStart(log.day) !== weekStart(today)) return null
  const before = sessions.filter((s) => s.id !== logId)
  const beforeMin = minutesOn(before, log.day)
  const todayMin = minutesOn(sessions, log.day)
  const { done, goal } = weekGoals({ guitarSessions: sessions, sportSessions: [] }, today).guitar
  if (beforeMin >= GUITAR_SESSION_MIN) return { kind: 'guitarBonus', done, goal }
  if (todayMin < GUITAR_SESSION_MIN) return { kind: 'guitarRemaining', beforeMin, todayMin, remainingMin: GUITAR_SESSION_MIN - todayMin }
  if (done === GUITAR_WEEKLY_SESSIONS) return { kind: 'weekDone', discipline: 'guitar', done }
  return { kind: 'guitarCounted', done, goal }
}

/** Moment sport du log `logId` : objectif de la semaine tenu, séances restantes ou bonus. `goal` : celui du plan s'il y en a un. */
export function sportMoment(sessions: SportSession[], logId: string, today: Day, goal: number = SPORT_WEEKLY_SESSIONS): GoalMoment | null {
  const log = sessions.find((s) => s.id === logId)
  if (!log) return null
  const week = weekStart(today)
  if (weekStart(log.day) !== week) return null
  const inWeek = (s: SportSession) => weekStart(s.day) === week
  const doneBefore = sessions.filter((s) => s.id !== logId && inWeek(s)).length
  const done = sessions.filter(inWeek).length
  if (doneBefore < goal && done >= goal) return { kind: 'weekDone', discipline: 'sport', done }
  if (done < goal) return { kind: 'weekProgress', done, remaining: goal - done, goal }
  return { kind: 'weekBonus', done }
}
