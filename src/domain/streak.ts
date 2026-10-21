import { addDays, weekStart } from './date'
import type { AppData, Day, GuitarSession } from './types'

/**
 * Rythme de la semaine (lot 4) : plus de série quotidienne. Une séance de guitare compte à partir de 30 min dans
 * la journée (plusieurs petites séances s'additionnent) ; l'objectif est de 5 par semaine, et de 3 séances de
 * sport (ou ce que prévoit le plan marathon). La série compte les semaines réussies : les deux objectifs tenus.
 * Repos et jours légers ne cassent rien.
 */
export const GUITAR_SESSION_MIN = 30
export const GUITAR_WEEKLY_SESSIONS = 5
export const SPORT_WEEKLY_SESSIONS = 3

function minutesByDay(sessions: GuitarSession[]): Map<Day, number> {
  const minutes = new Map<Day, number>()
  for (const s of sessions) minutes.set(s.day, (minutes.get(s.day) ?? 0) + s.durationMin)
  return minutes
}

/** Guitare aujourd'hui : minutes jouées, et ce qu'il manque pour que la séance du jour compte. */
export function guitarToday(sessions: GuitarSession[], today: Day): { todayMin: number; remainingMin: number } {
  const todayMin = minutesByDay(sessions).get(today) ?? 0
  return { todayMin, remainingMin: Math.max(0, GUITAR_SESSION_MIN - todayMin) }
}

type Data = Pick<AppData, 'guitarSessions' | 'sportSessions'>

/** Objectifs d'une semaine (celle du jour donné). `sportGoal` : l'objectif sport s'il vient du plan. */
export function weekGoals(data: Data, day: Day, sportGoal: number = SPORT_WEEKLY_SESSIONS) {
  const start = weekStart(day)
  const end = addDays(start, 6)
  const inWeek = (d: Day) => d >= start && d <= end
  const minutes = minutesByDay(data.guitarSessions.filter((s) => inWeek(s.day)))
  return {
    guitar: { done: [...minutes.values()].filter((m) => m >= GUITAR_SESSION_MIN).length, goal: GUITAR_WEEKLY_SESSIONS },
    sport: { done: data.sportSessions.filter((s) => inWeek(s.day)).length, goal: sportGoal },
  }
}

const success = (g: ReturnType<typeof weekGoals>) => g.guitar.done >= g.guitar.goal && g.sport.done >= g.sport.goal

/**
 * Série de semaines réussies. La semaine en cours compte si elle est déjà réussie, sans casser la série sinon.
 * `best` : la plus longue, depuis la première séance. `sportGoalOf` : l'objectif sport d'une semaine (le plan).
 */
export function weekStreak(data: Data, today: Day, sportGoalOf: (monday: Day) => number = () => SPORT_WEEKLY_SESSIONS) {
  const ok = (monday: Day) => success(weekGoals(data, monday, sportGoalOf(monday)))
  const thisWeek = weekStart(today)
  const thisWeekDone = ok(thisWeek)
  let weeks = 0
  for (let w = thisWeekDone ? thisWeek : addDays(thisWeek, -7); ok(w); w = addDays(w, -7)) weeks++

  const days = [...data.guitarSessions, ...data.sportSessions].map((s) => s.day).sort()
  let best = 0
  let run = 0
  if (days.length > 0)
    for (let w = weekStart(days[0]); w <= thisWeek; w = addDays(w, 7)) {
      run = ok(w) ? run + 1 : 0
      best = Math.max(best, run)
    }
  return { weeks, best, thisWeekDone }
}
