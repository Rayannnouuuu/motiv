/**
 * Secours de la bascule : l'ancienne version (Supabase) gardait sur le téléphone une copie de mes données
 * (« motiv.snapshot.v1 ») et les logs pas encore envoyés (file d'envoi). On les relit, fusionnés comme
 * l'ancienne appli les affichait, pour proposer un import sans fichier. Rien n'est jamais effacé ici.
 */
import type { AppData, BodyMetric, GuitarSession, Song, SportSession } from '../../domain/types'
import type { BackupV0 } from './v0ToV1'

export type OutboxEntry =
  | { id: string; kind: 'guitarSession'; payload: { session: GuitarSession; newSongs: Song[]; masteredSongIds: string[] } }
  | { id: string; kind: 'sportSession'; payload: SportSession }
  | { id: string; kind: 'bodyMetric'; payload: BodyMetric }

const read = (key: string): unknown => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null')
  } catch {
    return null
  }
}

/** Remplace l'élément de même id (log corrigé) ou l'ajoute. */
function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]
}

/** Ajoute aux données du serveur les logs encore en attente : la version en attente l'emporte. */
export function mergePending(server: AppData, pending: OutboxEntry[]): AppData {
  let { guitarSessions, sportSessions, bodyMetrics, songs } = server
  for (const e of pending) {
    if (e.kind === 'guitarSession') {
      const { session, newSongs, masteredSongIds } = e.payload
      guitarSessions = upsertById(guitarSessions, session)
      songs = [...songs, ...newSongs.filter((n) => !songs.some((s) => s.id === n.id))]
      songs = songs.map((s) => (masteredSongIds.includes(s.id) && s.status !== 'mastered' ? { ...s, status: 'mastered', masteredOn: session.day } : s))
    } else if (e.kind === 'sportSession') {
      sportSessions = upsertById(sportSessions, e.payload)
    } else {
      bodyMetrics = upsertById(bodyMetrics, e.payload)
    }
  }
  return { ...server, guitarSessions, sportSessions, bodyMetrics, songs }
}

const ARRAYS = ['guitarSessions', 'songs', 'sportSessions', 'programs', 'bodyMetrics', 'challenges'] as const

/** Données de l'ancienne version trouvées sur ce téléphone, sous forme de sauvegarde format 0, ou null. */
export function readLegacyLocal(): { backup: BackupV0; pending: number } | null {
  const snap = read('motiv.snapshot.v1') as { savedAt?: unknown; data?: Record<string, unknown> } | null
  if (!snap || typeof snap.savedAt !== 'number' || !snap.data || ARRAYS.some((k) => !Array.isArray(snap.data![k]))) return null
  const list = (key: string) => {
    const v = read(key)
    return Array.isArray(v) ? v : []
  }
  // Envoyés mais pas encore relus, puis en attente : même ordre que l'ancienne appli.
  const sent = list('motiv.outbox.sent.v1').map((x: { entry: OutboxEntry }) => x.entry)
  const pending = list('motiv.outbox.v1') as OutboxEntry[]
  return {
    backup: {
      app: 'motiv',
      schemaVersion: 0,
      exportedAt: new Date(snap.savedAt).toISOString(),
      data: mergePending(snap.data as unknown as AppData, [...sent, ...pending]),
    },
    pending: pending.length,
  }
}
