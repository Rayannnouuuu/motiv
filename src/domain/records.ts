import { getExercise, type ExerciseCategory } from '../content/exercises'
import type { GuitarSession, SportSession, SportSet } from './types'

export function bestBpm(sessions: GuitarSession[], exerciseId: string): number | null {
  let best: number | null = null
  for (const s of sessions)
    for (const it of s.items)
      if (it.kind === 'exercise' && it.exerciseId === exerciseId && it.maxBpm !== null)
        best = best === null ? it.maxBpm : Math.max(best, it.maxBpm)
  return best
}

export function maxDifficultyByCategory(sessions: GuitarSession[]): Partial<Record<ExerciseCategory, number>> {
  const max: Partial<Record<ExerciseCategory, number>> = {}
  for (const s of sessions)
    for (const it of s.items) {
      if (it.kind !== 'exercise') continue
      const e = getExercise(it.exerciseId)
      if (e) max[e.category] = Math.max(max[e.category] ?? 0, e.difficulty)
    }
  return max
}

/** Record = aucune série précédente avec une charge ≥ et des reps ≥ (spec §6.4). */
export function isSportRecord(previous: SportSet[], set: SportSet): boolean {
  return previous.length > 0 && !previous.some((p) => p.weightKg >= set.weightKg && p.reps >= set.reps)
}

export function setsForExercise(sessions: SportSession[], programExerciseId: string): SportSet[] {
  return sessions.flatMap((s) => s.sets.filter((x) => x.programExerciseId === programExerciseId))
}
