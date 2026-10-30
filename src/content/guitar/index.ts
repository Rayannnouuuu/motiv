/**
 * Contenu du module guitare (GUITARE.md §3, §8) : parcours, accords et formes de gammes, en données versionnées.
 * Générés par scripts/gen-guitar-path.mjs et scripts/gen-guitar.mjs ; vérifiés par guitar.test.ts.
 */
import chordsJson from './chords.json'
import pathJson from './path.json'
import scalesJson from './scales.json'
import { CHORD_TRACK, SCALE_TRACK } from './tracks'

export type Pillar = 'left_hand' | 'right_hand' | 'technique' | 'fretboard' | 'ear' | 'expression' | 'repertoire' | 'creativity'
export type Subdivision = 'quarter' | 'eighth' | 'triplet' | 'sixteenth'

export type Validation =
  | { kind: 'tempo'; exerciseId: string; bpm: number; subdivision: Subdivision; sessions: number }
  | { kind: 'changes_per_minute'; chords: [string, string][]; target: number; sessions: number }
  | { kind: 'checklist'; items: string[]; sessions: number }
  | { kind: 'quiz'; quizId: string; minScore: number; maxSecondsPerItem?: number; sessions: number }
  | { kind: 'pitch'; targetCents: number; hitsOutOf: [number, number] }
  | { kind: 'recording'; rubricId: string; minAverage: number }

export interface Skill {
  id: string
  level: number
  pillar: Pillar
  name: string
  why: string
  howTo: string
  prerequisites: string[]
  validation: Validation
  exerciseIds: string[]
  tips: string[]
  /** Texte ajouté, à relire (GUITARE.md §10). */
  review?: boolean
  /** Mise en place (accordage, son, posture) : cochée dans une fenêtre avant la séance, hors du temps de jeu. */
  setup?: boolean
  /** Compétence créée par moi (niveau 5, objectifs libres). */
  custom?: boolean
  /** Étape d'un parcours (accords) : hors des 3 compétences en cours, hors niveaux du parcours général. */
  track?: 'chords' | 'scales'
  /** Bloc d'un parcours : « Accords ouverts », « Barrés »… */
  block?: string
  /** Accords concernés (diagrammes). */
  chordIds?: string[]
  /** Formes de gammes concernées (diagrammes). */
  scaleIds?: string[]
}

export interface PathLevel {
  level: number
  name: string
  reference: string
  exam: string | null
  requiredSkillIds: string[]
}

export interface Chord {
  id: string
  name: string
  kind: 'open' | 'power' | 'barre' | 'seventh' | 'simplified'
  /** Du Mi grave (index 0) au Mi aigu (index 5). */
  frets: (number | 'x')[]
  fingers: number[]
  baseFret: number
  barre?: { fret: number; fromString: number; toString: number }
}

export interface ScaleShape {
  id: string
  name: string
  position: number
  notes: { string: number; fret: number; finger: number; degree: string }[]
}

export const PATH = pathJson as {
  version: number
  levels: PathLevel[]
  skills: Skill[]
  quizzes: { id: string; name: string }[]
  rubrics: { id: string; criteria: { label: string; min: number; max: number }[] }[]
}
export const SKILLS = PATH.skills
export const CHORDS = chordsJson as Chord[]
export const SCALE_SHAPES = scalesJson as ScaleShape[]

/** Étapes des parcours (accords) : retrouvables par `getSkill`, mais hors de `SKILLS` (niveaux, épreuves, suggestions). */
export const TRACK_SKILLS = [...CHORD_TRACK, ...SCALE_TRACK]
const skillById = new Map([...SKILLS, ...TRACK_SKILLS].map((s) => [s.id, s]))
export const getSkill = (id: string) => skillById.get(id)
export const getChord = (id: string) => CHORDS.find((c) => c.id === id)
