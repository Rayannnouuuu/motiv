import type { AppData } from '../domain/types'

/** Dernières données reçues du serveur, gardées sur le téléphone pour démarrer sans attendre (ni réseau). */
export interface Snapshot {
  savedAt: number
  data: AppData
}

const KEY = 'motiv.snapshot.v1'
const ARRAYS = ['guitarSessions', 'songs', 'sportSessions', 'programs', 'bodyMetrics', 'challenges'] as const satisfies readonly (keyof AppData)[]

function isSnapshot(v: unknown): v is Snapshot {
  if (typeof v !== 'object' || v === null) return false
  const { savedAt, data } = v as Partial<Record<keyof Snapshot, unknown>>
  if (typeof savedAt !== 'number' || typeof data !== 'object' || data === null) return false
  return ARRAYS.every((k) => Array.isArray((data as Record<string, unknown>)[k]))
}

export function readSnapshot(): Snapshot | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return isSnapshot(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** N'y mettre que des données serveur : jamais la fusion avec la file d'envoi. */
export function writeSnapshot(data: AppData, savedAt: number = Date.now()): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ savedAt, data } satisfies Snapshot))
  } catch {
    // Stockage plein ou indisponible (mode privé) : l'appli continue sans instantané.
  }
}

export function clearSnapshot(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Stockage indisponible : rien à effacer.
  }
}
