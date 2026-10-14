import type { Program, ProgramExercise, SportSession, SportSet } from '../../domain/types'

export interface LiveState {
  id: string
  programId: string
  startedAt: string
  /** Position dans les exos actifs du programme ; = leur nombre quand on passe à la fin. */
  exerciseIndex: number
  /** Exo affiché, pour retrouver sa place si le programme a changé depuis le début. */
  exerciseId: string | null
  weightKg: number
  reps: number
  sets: SportSet[]
  /** Début du repos en cours (horodatage ISO), null sans repos. Optionnel : absent des séances d'avant le minuteur. */
  restStartedAt?: string | null
  /** Durée du repos en cours, en secondes. */
  restSec?: number
}

export type LiveAction =
  | { type: 'weight'; delta: 2.5 | -2.5 }
  | { type: 'setWeight'; weightKg: number }
  | { type: 'reps'; delta: 1 | -1 }
  /** `at` : heure de la série, qui lance le repos. */
  | { type: 'completeSet'; at: string }
  /** Série déjà validée de l'exo en cours (setIndex à partir de 1) : la charge et les reps actuelles la remplacent. */
  | { type: 'updateSet'; setIndex: number }
  | { type: 'deleteSet'; setIndex: number }
  | { type: 'load'; weightKg: number; reps: number }
  | { type: 'nextExercise'; prefill: { weightKg: number; reps: number } }
  | { type: 'prevExercise'; prefill: { weightKg: number; reps: number } }
  | { type: 'finish' }
  | { type: 'restAdd' }
  | { type: 'restSkip' }

const KEY = 'motiv.liveSport.v1'
const STALE_MS = 12 * 60 * 60 * 1000
const REST_ADD_SEC = 30
const IDLE_START_MS = 30 * 60 * 1000

/** Repos selon les reps visées : lourd (≤ 6) 3 min, hypertrophie (≤ 12) 2 min, au-delà 1 min 30. */
export const restFor = (r: number) => (r <= 6 ? 180 : r <= 12 ? 120 : 90)

/** Secondes de repos restantes (arrondies au-dessus, au moins 0), null sans repos. Calculé depuis l'horodatage. */
export function restLeft(s: Pick<LiveState, 'restStartedAt' | 'restSec'>, now: Date): number | null {
  if (!s.restStartedAt) return null
  const end = new Date(s.restStartedAt).getTime() + (s.restSec ?? 0) * 1000
  return Math.max(0, Math.ceil((end - now.getTime()) / 1000))
}

export function activeExercises(program: Program | undefined): ProgramExercise[] {
  return program ? program.exercises.filter((e) => !e.archived).sort((a, b) => a.position - b.position) : []
}

/**
 * Recale l'index sur l'exo en cours. Si cet exo a été archivé ou supprimé, l'index pointe
 * déjà sur l'exo suivant de la liste mise à jour : il est donc sauté.
 */
export function resolveIndex(s: LiveState, exercises: ProgramExercise[]): number {
  const i = s.exerciseId ? exercises.findIndex((e) => e.id === s.exerciseId) : -1
  return i !== -1 ? i : Math.min(s.exerciseIndex, exercises.length)
}

export function liveReducer(s: LiveState, a: LiveAction, exercises: ProgramExercise[]): LiveState {
  const index = resolveIndex(s, exercises)
  const current = exercises[index]
  switch (a.type) {
    case 'weight':
      return { ...s, weightKg: Math.max(0, s.weightKg + a.delta) }
    case 'setWeight':
      return { ...s, weightKg: Number.isFinite(a.weightKg) ? Math.max(0, a.weightKg) : 0 }
    case 'reps':
      return { ...s, reps: Math.max(1, s.reps + a.delta) }
    case 'completeSet': {
      if (!current) return s
      const setIndex = s.sets.filter((x) => x.programExerciseId === current.id).length + 1
      // Écran ouvert puis laissé de côté (« Commencer » touché la veille, appli fermée) : la séance commence
      // vraiment à la première série. Au-delà de 30 min d'écart, son jour et sa durée partent de là.
      const idle = s.sets.length === 0 && new Date(a.at).getTime() - new Date(s.startedAt).getTime() > IDLE_START_MS
      return {
        ...s,
        ...(idle ? { startedAt: a.at } : {}),
        sets: [...s.sets, { programExerciseId: current.id, setIndex, reps: s.reps, weightKg: s.weightKg }],
        restStartedAt: a.at,
        restSec: restFor(current.targetReps),
      }
    }
    case 'updateSet':
      if (!current) return s
      return {
        ...s,
        sets: s.sets.map((x) => (x.programExerciseId === current.id && x.setIndex === a.setIndex ? { ...x, weightKg: s.weightKg, reps: s.reps } : x)),
      }
    case 'deleteSet': {
      if (!current) return s
      let n = 0
      const sets = s.sets
        .filter((x) => !(x.programExerciseId === current.id && x.setIndex === a.setIndex))
        .map((x) => (x.programExerciseId === current.id ? { ...x, setIndex: ++n } : x))
      return { ...s, sets }
    }
    case 'load':
      return { ...s, weightKg: a.weightKg, reps: a.reps }
    case 'nextExercise': {
      const next = exercises[index + 1]
      return { ...s, exerciseIndex: index + 1, exerciseId: next?.id ?? null, ...a.prefill }
    }
    case 'prevExercise': {
      if (index <= 0) return s
      const prev = exercises[index - 1]
      // On reprend la charge et les reps de la dernière série faite sur cet exo pendant la séance.
      const last = s.sets.filter((x) => x.programExerciseId === prev.id).at(-1)
      return { ...s, exerciseIndex: index - 1, exerciseId: prev.id, ...(last ? { weightKg: last.weightKg, reps: last.reps } : a.prefill) }
    }
    case 'finish':
      return { ...s, exerciseIndex: exercises.length, exerciseId: null, restStartedAt: null }
    case 'restAdd':
      return s.restStartedAt ? { ...s, restSec: (s.restSec ?? 0) + REST_ADD_SEC } : s
    case 'restSkip':
      return { ...s, restStartedAt: null }
  }
}

export function loadLive(): LiveState | null {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!v || typeof v !== 'object') return null
    const s = v as LiveState
    const ok =
      typeof s.id === 'string' &&
      typeof s.programId === 'string' &&
      typeof s.startedAt === 'string' &&
      typeof s.exerciseIndex === 'number' &&
      typeof s.weightKg === 'number' &&
      typeof s.reps === 'number' &&
      Array.isArray(s.sets)
    if (!ok) return null
    return {
      ...s,
      exerciseId: s.exerciseId ?? null,
      restStartedAt: typeof s.restStartedAt === 'string' ? s.restStartedAt : null,
      restSec: typeof s.restSec === 'number' ? s.restSec : 0,
    }
  } catch {
    return null
  }
}

export function saveLive(s: LiveState | null): void {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s))
    else localStorage.removeItem(KEY)
  } catch {
    // stockage indisponible : la séance continue en mémoire
  }
}

export function isStale(s: LiveState, now: Date): boolean {
  return now.getTime() - new Date(s.startedAt).getTime() > STALE_MS
}

export function elapsedMin(s: LiveState, now: Date): number {
  return Math.max(1, Math.round((now.getTime() - new Date(s.startedAt).getTime()) / 60000))
}

const kg = (w: number) => w.toLocaleString('fr-FR')

/** Charge et reps de départ d'un exo : `known` faux quand il n'a jamais été fait. */
export interface Prefill {
  weightKg: number
  reps: number
  known: boolean
}

/**
 * Comme la dernière fois : la série la plus lourde de la dernière séance sur l'exo (un échauffement plus
 * léger est ignoré). Jamais fait : 0 kg et les reps visées.
 */
export function prefillFor(pe: ProgramExercise, history: SportSession[]): Prefill {
  const [last] = recentSetsFor(pe, history, 1)
  if (!last) return { weightKg: 0, reps: pe.targetReps, known: false }
  const top = last.sets.reduce((best, s) => (s.weightKg > best.weightKg ? s : best))
  return { weightKg: top.weightKg, reps: top.reps, known: true }
}

export const formatWeight = (w: number) => (w === 0 ? 'PDC' : `${kg(w)} kg`)

/** Les `n` dernières séances où l'exo a été fait (la plus récente d'abord), avec toutes leurs séries. */
export function recentSetsFor(pe: ProgramExercise, history: SportSession[], n = 3): { day: string; sets: SportSet[] }[] {
  return [...history]
    .sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt))
    .map((s) => ({ day: s.day, sets: s.sets.filter((x) => x.programExerciseId === pe.id).sort((a, b) => a.setIndex - b.setIndex) }))
    .filter((s) => s.sets.length > 0)
    .slice(0, n)
}
