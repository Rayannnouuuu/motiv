import { useAppData } from '../../data/AppDataContext'
import { allLevels } from '../../domain/levels'
import { useSportGoalOf } from '../week/useRhythm'

/** Niveaux guitare, sport et global, avec les bonus des semaines réussies (objectif sport du plan compris). */
export function useLevels() {
  const { data, today } = useAppData()
  return allLevels(data, today, useSportGoalOf())
}
