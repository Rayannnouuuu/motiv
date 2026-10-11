import type { AppData } from '../domain/types'
import type { OutboxEntry } from './outbox'

/** Ajoute aux données serveur les logs encore dans la file hors-ligne (affichage optimiste). */
export function mergePending(server: AppData, pending: OutboxEntry[]): AppData {
  let { guitarSessions, sportSessions, bodyMetrics, songs } = server
  for (const e of pending) {
    if (e.kind === 'guitarSession') {
      const { session, newSongs, masteredSongIds } = e.payload
      if (!guitarSessions.some((s) => s.id === session.id)) guitarSessions = [...guitarSessions, session]
      songs = [...songs, ...newSongs.filter((n) => !songs.some((s) => s.id === n.id))]
      songs = songs.map((s) =>
        masteredSongIds.includes(s.id) && s.status !== 'mastered' ? { ...s, status: 'mastered', masteredOn: session.day } : s,
      )
    } else if (e.kind === 'sportSession') {
      if (!sportSessions.some((s) => s.id === e.id)) sportSessions = [...sportSessions, e.payload]
    } else if (!bodyMetrics.some((m) => m.id === e.id)) {
      bodyMetrics = [...bodyMetrics, e.payload]
    }
  }
  return { ...server, guitarSessions, sportSessions, bodyMetrics, songs }
}
