/**
 * Modèle de données v1 (REFONTE §5, adapté à l'existant ; écarts justifiés dans docs/lots/LOT-1-DONNEES.md).
 * Une seule source de vérité : les séances, guitare et sport dans la même forme (blocs → entrées → séries).
 * Au lot 1, les écrans lisent encore l'ancienne forme (domain/types.ts) : data/migrations/project.ts la recalcule.
 */
import type { Equipment, MuscleGroup, RepRange, SportMetric } from '../content/sportLibrary'
import type { Day, Domain, Rating } from './types'

export type Discipline = Domain

export type BlockType = 'warmup' | 'technique' | 'repertoire' | 'creative' | 'main' | 'accessory' | 'conditioning'

/** Une série. Champs absents plutôt qu'undefined : la sauvegarde JSON doit rendre exactement la même chose. */
export interface SetRecord {
  reps?: number
  loadKg?: number
  bpm?: number
  durationSec?: number
  distanceKm?: number
  /** Tempo joué proprement. Jamais déduit pour l'historique : l'ancien « tempo max » n'en disait rien. */
  clean?: boolean
  rpe?: number
}

/** Un exercice ou un morceau travaillé dans la séance (exactement l'un des deux). */
export interface Entry {
  exerciseId?: string
  songId?: string
  /** Ligne du modèle de séance d'où vient l'entrée (ancien id d'exo de programme). */
  templateEntryId?: string
  /** Morceau passé « maîtrisé » pendant cette séance. */
  markedMastered?: true
  sets: SetRecord[]
}

export interface Block {
  type: BlockType
  entries: Entry[]
}

export interface Session {
  id: string
  discipline: Discipline
  day: Day
  /** Instant d'enregistrement, gardé tel quel : il départage deux séances du même jour. */
  createdAt: string
  durationMin: number
  isLight: boolean
  flowScore: Rating
  desireScore: Rating
  note?: string
  /** Modèle de séance suivi (ancien programme sport). */
  templateId?: string
  blocks: Block[]
  /** Écart au §5 jusqu'au lot 4 : l'XP reste celle calculée à l'enregistrement, pour que les niveaux ne bougent pas. */
  xp: number
}

export type SongStatus = 'to_learn' | 'learning' | 'mastered' | 'maintain'

/** Titre, artiste et notes : jamais de tablature ni de paroles. */
export interface Song {
  id: string
  title: string
  artist: string
  notes?: string
  targetBpm?: number
  status: SongStatus
  masteredOn: Day | null
}

/** Mouvement de la bibliothèque sport, modifiable. Les exos guitare restent dans le code (src/content/exercises). */
export interface Movement {
  id: string
  discipline: 'sport'
  name: string
  /** null pour un mouvement à toi pas encore complété. */
  category: MuscleGroup | null
  body: 'upper' | 'lower' | null
  metric: SportMetric
  repRange: RepRange | null
  equipment: Equipment | null
  aliases: string[]
  source: 'legacy' | 'user'
  archived: boolean
}

export interface TemplateEntry {
  id: string
  exerciseId: string
  /** Nom tel que je l'ai tapé dans le programme. */
  name: string
  targetSets: number
  targetReps: number
  position: number
  archived: boolean
}

/** Modèle de séance (ancien programme sport). */
export interface Template {
  id: string
  discipline: Discipline
  name: string
  position: number
  archived: boolean
  blocks: { type: BlockType; entries: TemplateEntry[] }[]
}

export interface Measurement {
  id: string
  day: Day
  weightKg: number | null
  waistCm: number | null
  chestCm: number | null
  armCm: number | null
  thighCm: number | null
}

export type ChallengeTarget =
  | { kind: 'bpm'; exerciseId: string; bpm: number; baseline: number | null }
  | { kind: 'song'; songId: string }
  | { kind: 'weight'; exerciseId: string; templateEntryId: string; reps: number; weightKg: number; baseline: number }
  | { kind: 'reps'; exerciseId: string; templateEntryId: string; weightKg: number; reps: number; baseline: number }
  | { kind: 'sessionsInWeek'; count: number }

/** Défis bloquants : gardés tels quels jusqu'au lot 4 (remplacés par les objectifs de cycle). */
export interface Challenge {
  id: string
  domain: Discipline
  level: number
  target: ChallengeTarget
  easier: boolean
  status: 'active' | 'done' | 'replaced'
  createdOn: Day
  blockedSince: Day | null
  doneOn: Day | null
  rerolls: number
}

/** Ce qu'on sait de mes données elles-mêmes (exporté avec elles). */
export interface Profile {
  key: 'profile'
  migratedFrom: { format: 0; exportedAt: string } | null
  /** Niveaux au moment de la migration : plancher du lot 4. */
  levelsAtMigration: { guitar: number; sport: number; global: number } | null
}

export interface DataV1 {
  exercises: Movement[]
  songs: Song[]
  sessions: Session[]
  templates: Template[]
  measurements: Measurement[]
  challenges: Challenge[]
  profile: Profile
}

export const EMPTY_PROFILE: Profile = { key: 'profile', migratedFrom: null, levelsAtMigration: null }

export const EMPTY_DATA_V1: DataV1 = { exercises: [], songs: [], sessions: [], templates: [], measurements: [], challenges: [], profile: EMPTY_PROFILE }
