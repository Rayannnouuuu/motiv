/**
 * Chrono de guitare en cours. Tout est en horodatages : il survit à la fermeture de l'appli
 * (iOS tue souvent une PWA en arrière-plan) et le temps écoulé se recalcule à la réouverture.
 */
export interface PracticeState {
  id: string
  startedAt: string
  /** Début de la pause en cours, null quand le chrono tourne. */
  pausedAt: string | null
  /** Durée cumulée des pauses terminées. */
  pausedMs: number
  /** Exos cochés pendant la séance. */
  exercises: string[]
  /** Morceaux cochés pendant la séance. */
  songs: string[]
  /** Les feux d'artifice de l'objectif du jour ont déjà été tirés pour cette séance. */
  goalCelebrated: boolean
  /** Tempo le plus rapide joué au métronome (fiche exo) pendant la séance, par exo : prioritaire sur le record. */
  bpms?: Record<string, number>
}

export type PracticeAction =
  | { type: 'pause'; at: Date }
  | { type: 'resume'; at: Date }
  | { type: 'toggleExercise'; id: string }
  | { type: 'toggleSong'; id: string }
  | { type: 'celebrated' }
  /** Exo coché depuis sa fiche, avec le tempo joué au métronome s'il y en a un. */
  | { type: 'checkExercise'; id: string; bpm: number | null }

const KEY = 'motiv.practice.v1'
const STALE_MS = 12 * 60 * 60 * 1000
const MAX_MIN = 600

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

export function startPractice(now: Date, id: string): PracticeState {
  return { id, startedAt: now.toISOString(), pausedAt: null, pausedMs: 0, exercises: [], songs: [], goalCelebrated: false }
}

export function practiceReducer(s: PracticeState, a: PracticeAction): PracticeState {
  switch (a.type) {
    case 'pause':
      // Une deuxième pause ne déplace pas le début de la première.
      return s.pausedAt !== null ? s : { ...s, pausedAt: a.at.toISOString() }
    case 'resume':
      if (s.pausedAt === null) return s
      return { ...s, pausedAt: null, pausedMs: s.pausedMs + Math.max(0, a.at.getTime() - new Date(s.pausedAt).getTime()) }
    case 'toggleExercise':
      return { ...s, exercises: toggle(s.exercises, a.id) }
    case 'toggleSong':
      return { ...s, songs: toggle(s.songs, a.id) }
    case 'celebrated':
      return s.goalCelebrated ? s : { ...s, goalCelebrated: true }
    case 'checkExercise':
      return {
        ...s,
        exercises: s.exercises.includes(a.id) ? s.exercises : [...s.exercises, a.id],
        // Le plus rapide des passages sur la fiche : une deuxième visite plus lente n'efface pas le record.
        bpms: a.bpm === null ? s.bpms : { ...s.bpms, [a.id]: Math.max(a.bpm, s.bpms?.[a.id] ?? 0) },
      }
  }
}

/** Temps joué, pauses déduites ; figé pendant une pause. */
export function elapsedMs(s: PracticeState, now: Date): number {
  const end = s.pausedAt !== null ? new Date(s.pausedAt).getTime() : now.getTime()
  return Math.max(0, end - new Date(s.startedAt).getTime() - s.pausedMs)
}

/** Minutes à logger : au moins 1, au plus 600 (limite du formulaire). */
export function logMinutes(s: PracticeState, now: Date): number {
  return Math.min(MAX_MIN, Math.max(1, Math.round(elapsedMs(s, now) / 60000)))
}

/** « 4:07 » sous l'heure, « 1:02:03 » au-delà. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** Séance commencée il y a plus de 12 h : probablement oubliée. */
export function isStale(s: PracticeState, now: Date): boolean {
  return now.getTime() - new Date(s.startedAt).getTime() > STALE_MS
}

/** Minutes du chrono enregistré, null sans chrono ou s'il a été oublié (plus de 12 h). */
export function runningPracticeMinutes(now: Date = new Date()): number | null {
  const s = loadPractice()
  return s && !isStale(s, now) ? logMinutes(s, now) : null
}

const isStringArray =(v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')
const isDate = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(new Date(v).getTime())

export function loadPractice(): PracticeState | null {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!v || typeof v !== 'object') return null
    const s = v as PracticeState
    const ok =
      typeof s.id === 'string' &&
      isDate(s.startedAt) &&
      (s.pausedAt === null || isDate(s.pausedAt)) &&
      typeof s.pausedMs === 'number' &&
      Number.isFinite(s.pausedMs) &&
      isStringArray(s.exercises) &&
      isStringArray(s.songs) &&
      typeof s.goalCelebrated === 'boolean'
    if (!ok) return null
    const bpms =
      s.bpms && typeof s.bpms === 'object'
        ? Object.fromEntries(Object.entries(s.bpms).filter(([, b]) => typeof b === 'number' && Number.isFinite(b) && b > 0))
        : undefined
    return { id: s.id, startedAt: s.startedAt, pausedAt: s.pausedAt, pausedMs: s.pausedMs, exercises: s.exercises, songs: s.songs, goalCelebrated: s.goalCelebrated, ...(bpms ? { bpms } : {}) }
  } catch {
    return null
  }
}

export function savePractice(s: PracticeState | null): void {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s))
    else localStorage.removeItem(KEY)
  } catch {
    // stockage indisponible : le chrono continue en mémoire
  }
}
