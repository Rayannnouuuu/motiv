import arpeggios from './exercises/arpeggios.json'
import arpeggiosPlus from './exercises/arpeggios-plus.json'
import bends from './exercises/bends.json'
import bendsPlus from './exercises/bends-plus.json'
import chords from './exercises/chords.json'
import chromatic from './exercises/chromatic.json'
import legato from './exercises/legato.json'
import legatoPlus from './exercises/legato-plus.json'
import palmMuting from './exercises/palmMuting.json'
import palmMutingPlus from './exercises/palmMuting-plus.json'
import picking from './exercises/picking.json'
import pickingPlus from './exercises/picking-plus.json'
import powerChords from './exercises/powerChords.json'
import rhythm from './exercises/rhythm.json'
import rhythmPlus from './exercises/rhythm-plus.json'
import scales from './exercises/scales.json'
import scalesPlus from './exercises/scales-plus.json'
import strumming from './exercises/strumming.json'
import sweep from './exercises/sweep.json'

export type ExerciseCategory =
  'chromatic' | 'strumming' | 'chords' | 'powerChords' | 'arpeggios' | 'bends' | 'legato' | 'palmMuting' | 'picking' | 'rhythm' | 'scales' | 'sweep'

export interface TabNote {
  /** 1 = mi aigu, 6 = mi grave. */
  string: number
  fret: number
  startBeat: number
  duration: number
  /** h = hammer-on, p = pull-off, b = bend, PM = palm mute. */
  technique?: 'hammer' | 'pull' | 'bend' | 'palmMute'
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
  /** « legacy » : reprise de l'ancien site ; « new » : base guitare (lot G1, `scripts/gen-guitar.mjs`). */
  source: 'legacy' | 'new'
  /** Contenu ajouté, à relire avant d'être considéré comme sûr (GUITARE.md §10). */
  review?: true
  pattern: TabNote[]
}

const suffix = (id: string) => Number(id.slice(id.lastIndexOf('-') + 1))

/** Les JSON sont vérifiés par exercises.test.ts (champs, tempos, tablature). */
export const EXERCISES = [
  chromatic,
  strumming,
  chords,
  powerChords,
  arpeggios,
  arpeggiosPlus,
  bends,
  bendsPlus,
  legato,
  legatoPlus,
  palmMuting,
  palmMutingPlus,
  picking,
  pickingPlus,
  rhythm,
  rhythmPlus,
  scales,
  scalesPlus,
  sweep,
].flat() as Exercise[]

const byId = new Map(EXERCISES.map((e) => [e.id, e]))

export function getExercise(id: string): Exercise | undefined {
  return byId.get(id)
}

export function nextInCategory(ex: Exercise): Exercise | undefined {
  return EXERCISES.filter((e) => e.category === ex.category && e.difficulty === ex.difficulty + 1).sort((a, b) => suffix(a.id) - suffix(b.id))[0]
}

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  chromatic: 'Chromatique',
  strumming: 'Grattage',
  chords: 'Accords',
  powerChords: 'Power chords',
  arpeggios: 'Arpèges',
  bends: 'Bends',
  legato: 'Legato',
  palmMuting: 'Palm muting',
  picking: 'Picking',
  rhythm: 'Rythme',
  scales: 'Gammes',
  sweep: 'Sweep',
}
