import type { Session, SetRecord } from './model'

/** Ce qui a été fait pour un exo (ou un mouvement) dans une séance. */
export interface Done {
  sessionId: string
  day: string
  sets: SetRecord[]
}

/** Plus récente d'abord : jour, puis heure d'enregistrement (deux séances le même jour). */
export const newestFirst = (a: Pick<Session, 'day' | 'createdAt'>, b: Pick<Session, 'day' | 'createdAt'>) =>
  a.day !== b.day ? (a.day < b.day ? 1 : -1) : a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0

/**
 * Historique d'un exo guitare ou d'un mouvement sport, séance par séance, du plus récent au plus ancien.
 * Suit le mouvement, pas la ligne du programme : changer de programme garde les dernières fois et les records.
 * Les séances sans série pour lui sont ignorées.
 */
export function historyOf(sessions: Session[], exerciseId: string): Done[] {
  return [...sessions]
    .sort(newestFirst)
    .map((s) => ({
      sessionId: s.id,
      day: s.day,
      sets: s.blocks.flatMap((b) => b.entries.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets)),
    }))
    .filter((d) => d.sets.length > 0)
}

const max = (xs: number[]) => (xs.length > 0 ? Math.max(...xs) : null)

/** Tempo le plus rapide joué proprement dans une séance (null si aucun). */
export const cleanBpm = (d: Done) => max(d.sets.flatMap((x) => (x.clean && x.bpm !== undefined ? [x.bpm] : [])))

/** Tempo le plus rapide joué, propre ou non. */
export const playedBpm = (d: Done) => max(d.sets.flatMap((x) => (x.bpm !== undefined ? [x.bpm] : [])))
