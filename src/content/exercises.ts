import arpeggios from './exercises/arpeggios.json'
import bends from './exercises/bends.json'
import legato from './exercises/legato.json'
import palmMuting from './exercises/palmMuting.json'
import picking from './exercises/picking.json'
import rhythm from './exercises/rhythm.json'
import scales from './exercises/scales.json'
import sweep from './exercises/sweep.json'

export type ExerciseCategory =
  | 'arpeggios'
  | 'bends'
  | 'legato'
  | 'palmMuting'
  | 'picking'
  | 'rhythm'
  | 'scales'
  | 'sweep'

export interface TabNote {
  /** 1 = mi aigu, 6 = mi grave. */
  string: number
  fret: number
  startBeat: number
  duration: number
  technique?: 'hammer' | 'bend' | 'palmMute'
}

export interface Exercise {
  id: string
  title: string
  category: ExerciseCategory
  difficulty: number
  description: string
  targetBpm: number
  pattern: TabNote[]
}

const suffix = (id: string) => Number(id.slice(id.lastIndexOf('-') + 1))

export const EXERCISES: Exercise[] = [arpeggios, bends, legato, palmMuting, picking, rhythm, scales, sweep]
  .flat()
  .map(({ id, title, category, difficulty, description, targetBpm, pattern }) => ({
    id,
    title,
    category: category as ExerciseCategory,
    difficulty,
    description,
    targetBpm,
    pattern: pattern as TabNote[],
  }))

const byId = new Map(EXERCISES.map((e) => [e.id, e]))

export function getExercise(id: string): Exercise | undefined {
  return byId.get(id)
}

export function nextInCategory(ex: Exercise): Exercise | undefined {
  return EXERCISES.filter((e) => e.category === ex.category && e.difficulty === ex.difficulty + 1).sort(
    (a, b) => suffix(a.id) - suffix(b.id),
  )[0]
}

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  arpeggios: 'Arpèges',
  bends: 'Bends',
  legato: 'Legato',
  palmMuting: 'Palm muting',
  picking: 'Picking',
  rhythm: 'Rythme',
  scales: 'Gammes',
  sweep: 'Sweep',
}
