import { setsForExercise } from '../../domain/records'
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
}

export type LiveAction =
  | { type: 'weight'; delta: 2.5 | -2.5 }
  | { type: 'setWeight'; weightKg: number }
  | { type: 'reps'; delta: 1 | -1 }
  | { type: 'completeSet' }
  /** Série déjà validée de l'exo en cours (setIndex à partir de 1) : la charge et les reps actuelles la remplacent. */
  | { type: 'updateSet'; setIndex: number }
  | { type: 'deleteSet'; setIndex: number }
  | { type: 'load'; weightKg: number; reps: number }
  | { type: 'nextExercise'; prefill: { weightKg: number; reps: number } }
  | { type: 'prevExercise'; prefill: { weightKg: number; reps: number } }
  | { type: 'finish' }

const KEY = 'motiv.liveSport.v1'
const STALE_MS = 12 * 60 * 60 * 1000

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
      return { ...s, sets: [...s.sets, { programExerciseId: current.id, setIndex, reps: s.reps, weightKg: s.weightKg }] }
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
      return { ...s, exerciseIndex: exercises.length, exerciseId: null }
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
    return ok ? { ...s, exerciseId: s.exerciseId ?? null } : null
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

export interface Prefill {
  weightKg: number
  reps: number
  /** « Dernière fois : 4×8 à 62,5 kg », null sans historique. */
  summary: string | null
}

/** Pré-remplissage depuis la dernière séance où l'exo a été fait (série la plus lourde). */
export function prefillFor(pe: ProgramExercise, history: SportSession[]): Prefill {
  const last = [...history]
    .sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt))
    .find((s) => s.sets.some((x) => x.programExerciseId === pe.id))
  if (!last) return { weightKg: 0, reps: pe.targetReps, summary: null }
  const sets = setsForExercise([last], pe.id)
  const top = sets.reduce((a, b) => (b.weightKg > a.weightKg || (b.weightKg === a.weightKg && b.reps > a.reps) ? b : a))
  const load = top.weightKg === 0 ? 'au PDC' : `à ${kg(top.weightKg)} kg`
  return { weightKg: top.weightKg, reps: top.reps, summary: `Dernière fois : ${sets.length}×${top.reps} ${load}` }
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
