export type Day = string // 'YYYY-MM-DD', Europe/Paris
export type Rating = 1 | 2 | 3 | 4 | 5
export type Domain = 'guitar' | 'sport'

/** `clean` : tempo joué proprement (séance en direct du lot 2) ; absent dans l'historique d'avant. */
export type GuitarItem =
  { kind: 'exercise'; exerciseId: string; maxBpm: number | null; clean?: true } | { kind: 'song'; songId: string; markedMastered: boolean }

export interface GuitarSession {
  id: string
  day: Day
  durationMin: number
  flowRating: Rating
  desireRating: Rating
  xp: number
  createdAt: string
  items: GuitarItem[]
  note?: string
}

export interface Song {
  id: string
  title: string
  status: 'learning' | 'mastered'
  masteredOn: Day | null
}

export interface ProgramExercise {
  id: string
  programId: string
  name: string
  targetSets: number
  targetReps: number
  position: number
  archived: boolean
}

export interface Program {
  id: string
  name: string
  position: number
  archived: boolean
  exercises: ProgramExercise[]
}

export interface SportSet {
  programExerciseId: string
  setIndex: number
  reps: number
  weightKg: number // 0 = poids du corps
}

export interface SportSession {
  id: string
  day: Day
  programId: string
  durationMin: number
  flowRating: Rating
  desireRating: Rating
  xp: number
  createdAt: string
  sets: SportSet[]
  note?: string
}

export type BodyField = 'weightKg' | 'waistCm' | 'chestCm' | 'armCm' | 'thighCm'

export interface BodyMetric {
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
  | { kind: 'weight'; programExerciseId: string; reps: number; weightKg: number; baseline: number }
  | { kind: 'reps'; programExerciseId: string; weightKg: number; reps: number; baseline: number }
  | { kind: 'sessionsInWeek'; count: number }

export interface Challenge {
  id: string
  domain: Domain
  level: number
  target: ChallengeTarget
  easier: boolean
  status: 'active' | 'done' | 'replaced'
  createdOn: Day
  blockedSince: Day | null
  doneOn: Day | null
  rerolls: number
}

export interface AppData {
  guitarSessions: GuitarSession[]
  songs: Song[]
  sportSessions: SportSession[]
  programs: Program[]
  bodyMetrics: BodyMetric[]
  challenges: Challenge[]
}

export const EMPTY_DATA: AppData = {
  guitarSessions: [],
  songs: [],
  sportSessions: [],
  programs: [],
  bodyMetrics: [],
  challenges: [],
}
