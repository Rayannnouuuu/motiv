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
  /** Stable : l'historique des séances le référence. */
  id: string
  title: string
  category: ExerciseCategory
  difficulty: number
  description: string
  /** Ce qu'on mesure pour progresser : le tempo. */
  metric: 'bpm'
  /** Tempo conseillé tant que tu n'as pas de record sur l'exo. */
  startBpm: number
  targetBpm: number
  /** Reprise de l'ancien site. */
  source: 'legacy'
  pattern: TabNote[]
}

const suffix = (id: string) => Number(id.slice(id.lastIndexOf('-') + 1))

/** Les JSON sont vérifiés par exercises.test.ts (champs, tempos, tablature). */
export const EXERCISES = [arpeggios, bends, legato, palmMuting, picking, rhythm, scales, sweep].flat() as Exercise[]

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
