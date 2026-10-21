/**
 * Bilan du dimanche (lot 4) : 3 questions, 2 minutes. Ce qui a marché, ce qui a bloqué, le focus de la semaine
 * suivante. Rangé dans le profil ; le focus s'affiche pendant la semaine d'après.
 */
import { addDays, weekStart } from './date'
import type { Day } from './types'

export interface WeeklyReview {
  /** Lundi de la semaine dont on fait le bilan. */
  week: Day
  worked: string
  blocked: string
  focus: string
  at: Day
}

export const REVIEW_MAX = 300

const isSunday = (day: Day) => addDays(weekStart(day), 6) === day

/** La semaine dont le bilan est à faire : celle qui finit aujourd'hui (dimanche), ou celle d'avant (lundi), si pas encore fait. */
export function reviewDue(reviews: WeeklyReview[] = [], today: Day): Day | null {
  const done = (w: Day) => reviews.some((r) => r.week === w)
  const thisWeek = weekStart(today)
  if (isSunday(today)) return done(thisWeek) ? null : thisWeek
  const lastWeek = addDays(thisWeek, -7)
  return today === thisWeek && !done(lastWeek) ? lastWeek : null
}

/** Le focus choisi dimanche dernier pour la semaine en cours. */
export function focusOf(reviews: WeeklyReview[] = [], today: Day): string | null {
  const r = reviews.find((x) => x.week === addDays(weekStart(today), -7))
  return r?.focus.trim() || null
}
