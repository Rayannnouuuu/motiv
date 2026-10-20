/**
 * Sortie de course en direct (lot 3). Tout en horodatages, comme le chrono guitare : elle survit à la
 * fermeture de l'appli, et le temps se recalcule à la réouverture.
 */
import { storageKey } from '../../data/db'
import type { RunKind, Segment } from '../../domain/marathon/plan'
import type { Day } from '../../domain/types'

export interface RunState {
  id: string
  day: Day
  kind: RunKind
  /** Km prévus (0 pour une sortie libre). */
  km: number
  startedAt: string
  pausedAt: string | null
  pausedMs: number
}

const KEY = storageKey('run.v1')

export function loadRun(): RunState | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as RunState | null
    const date = (x: unknown) => typeof x === 'string' && !Number.isNaN(new Date(x).getTime())
    return v && typeof v.id === 'string' && date(v.startedAt) && (v.pausedAt === null || date(v.pausedAt)) && typeof v.pausedMs === 'number' ? v : null
  } catch {
    return null
  }
}

export function saveRun(s: RunState | null): void {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s))
    else localStorage.removeItem(KEY)
  } catch {
    // stockage indisponible : la sortie continue en mémoire
  }
}

/** Le bloc du minuteur en cours et le temps qu'il lui reste ; null une fois tous les blocs passés. */
export function segmentAt(segments: Segment[], elapsedSec: number): { index: number; left: number } | null {
  let t = 0
  for (const [index, s] of segments.entries()) {
    if (elapsedSec < t + s.sec) return { index, left: Math.ceil(t + s.sec - elapsedSec) }
    t += s.sec
  }
  return null
}

/** « 4:07 » */
export const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, Math.floor(sec % 60))).padStart(2, '0')}`
