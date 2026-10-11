import type { AppData } from '../domain/types'
import type { OutboxEntry } from './outbox'

/** Remplace l'élément de même id (log corrigé) ou l'ajoute. */
function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]
}

/** Ajoute aux données serveur les logs encore dans la file hors-ligne (affichage optimiste). La version en attente l'emporte. */
export function mergePending(server: AppData, pending: OutboxEntry[]): AppData {
  let { guitarSessions, sportSessions, bodyMetrics, songs } = server
  for (const e of pending) {
    if (e.kind === 'guitarSession') {
      const { session, newSongs, masteredSongIds } = e.payload
      guitarSessions = upsertById(guitarSessions, session)
      songs = [...songs, ...newSongs.filter((n) => !songs.some((s) => s.id === n.id))]
      songs = songs.map((s) =>
        masteredSongIds.includes(s.id) && s.status !== 'mastered' ? { ...s, status: 'mastered', masteredOn: session.day } : s,
      )
    } else if (e.kind === 'sportSession') {
      sportSessions = upsertById(sportSessions, e.payload)
    } else {
      bodyMetrics = upsertById(bodyMetrics, e.payload)
    }
  }
  return { ...server, guitarSessions, sportSessions, bodyMetrics, songs }
}
