import { useAppData } from '../../data/AppDataContext'
import { cyclesReached } from '../../domain/cycles'
import { allLevels, XP_CYCLE_GOAL } from '../../domain/levels'
import { useSportGoalOf } from '../week/useRhythm'

/** Niveaux guitare, sport et global, avec les bonus des semaines réussies et des objectifs de cycle atteints. */
export function useLevels() {
  const { data, v1, today } = useAppData()
  const reached = cyclesReached(v1.profile.cycles, data.challenges)
  return allLevels(data, today, useSportGoalOf(), { guitar: reached.guitar * XP_CYCLE_GOAL, sport: reached.sport * XP_CYCLE_GOAL })
}
