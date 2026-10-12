import type { TabNote } from '../../content/exercises'
import { roundEven } from '../../domain/challenges'

/** Logique pure du métronome (sans audio) : tempo de départ, subdivision, programmation des clics. */

export type Subdivision = 1 | 2 | 3 | 4
export type ClickKind = 'bar' | 'beat' | 'sub'

export interface Click {
  /** Instant du clic, sur l'horloge du contexte audio (secondes). */
  time: number
  kind: ClickKind
  index: number
}

/** Prochain clic à programmer. */
export interface Cursor {
  nextTime: number
  index: number
}

export const MIN_BPM = 30
export const MAX_BPM = 260

const SUBDIVISIONS: Subdivision[] = [1, 2, 3, 4]
const EPSILON = 1e-6

const isWhole = (x: number) => Math.abs(x - Math.round(x)) < EPSILON

/** Plus petite subdivision du temps sur laquelle tombent toutes les notes (noires = 1, croches = 2…). */
export function subdivisionOf(pattern: TabNote[]): Subdivision {
  return SUBDIVISIONS.find((d) => pattern.every((n) => isWhole(n.startBeat * d))) ?? 4
}

/** Arrondit puis borne entre MIN_BPM et MAX_BPM. */
export function clampBpm(n: number): number {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(n)))
}

/** Tempo de départ : ton record, sinon 70 % du tempo cible (arrondi pair). */
export function startBpm(best: number | null, targetBpm: number): number {
  return clampBpm(best ?? roundEven(targetBpm * 0.7))
}

/** Premier temps de la mesure, autre temps, ou subdivision. */
export function clickKind(index: number, sub: number, beatsPerBar = 4): ClickKind {
  if (index % (sub * beatsPerBar) === 0) return 'bar'
  if (index % sub === 0) return 'beat'
  return 'sub'
}

/**
 * Programme les clics qui tombent avant `now + lookahead`, puis renvoie le curseur suivant.
 * Le tempo est relu à chaque appel : un changement s'applique au clic suivant, sans à-coup.
 */
export function schedule(cursor: Cursor, now: number, lookahead: number, bpm: number, sub: number): { clicks: Click[]; next: Cursor } {
  const step = 60 / bpm / sub
  const clicks: Click[] = []
  let { nextTime, index } = cursor
  while (nextTime < now + lookahead) {
    clicks.push({ time: nextTime, kind: clickKind(index, sub), index })
    nextTime += step
    index += 1
  }
  return { clicks, next: { nextTime, index } }
}

/**
 * Changement de subdivision en pleine lecture : le prochain clic se cale sur la nouvelle grille,
 * à partir de la même position dans la mesure (pas de saut de temps).
 */
export function resubdivide(cursor: Cursor, from: number, to: number, bpm: number): Cursor {
  const beat = cursor.index / from
  const raw = beat * to
  const index = isWhole(raw) ? Math.round(raw) : Math.ceil(raw)
  return { nextTime: cursor.nextTime + (index / to - beat) * (60 / bpm), index }
}
