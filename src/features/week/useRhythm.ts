import { useAppData } from '../../data/AppDataContext'
import { weekStart } from '../../domain/date'
import { weekGoals, weekStreak, SPORT_WEEKLY_SESSIONS } from '../../domain/streak'
import type { Day } from '../../domain/types'
import { useMarathon } from '../marathon/useMarathon'
import { planWeekCount } from './planWeek'

/**
 * Le rythme de la semaine (lot 4) : objectifs guitare et sport, et la série de semaines réussies.
 * Pendant un plan marathon, l'objectif sport de chaque semaine vient du plan (sorties + muscu).
 */
export function useRhythm() {
  const { data, v1, today } = useAppData()
  const mk = useMarathon()
  const sportGoalOf = (monday: Day) => {
    const w = mk?.plan?.weeks.find((x) => x.start === monday)
    return w ? planWeekCount(w, v1.sessions).goal : SPORT_WEEKLY_SESSIONS
  }
  const week = weekGoals(data, today, sportGoalOf(weekStart(today)))
  const streak = weekStreak(data, today, sportGoalOf)
  return { week, streak }
}
