import type { BodyMetric, GuitarSession, Song, SportSession } from '../domain/types'

export type OutboxEntry =
  | { id: string; kind: 'guitarSession'; payload: { session: GuitarSession; newSongs: Song[]; masteredSongIds: string[] } }
  | { id: string; kind: 'sportSession'; payload: SportSession }
  | { id: string; kind: 'bodyMetric'; payload: BodyMetric }

const KEY = 'motiv.outbox.v1'

export function readOutbox(): OutboxEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as OutboxEntry[]) : []
  } catch {
    return []
  }
}

function write(entries: OutboxEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export function enqueue(e: OutboxEntry): void {
  write([...readOutbox().filter((x) => x.id !== e.id), e])
}

let running: Promise<{ sent: number; left: number }> | null = null

/** Envoie les entrées dans l'ordre ; s'arrête au premier échec (les suivantes restent). */
export function flush(send: (e: OutboxEntry) => Promise<void>): Promise<{ sent: number; left: number }> {
  running ??= (async () => {
    let sent = 0
    try {
      for (const e of readOutbox()) {
        try {
          await send(e)
        } catch {
          break
        }
        write(readOutbox().filter((x) => x.id !== e.id))
        sent++
      }
      return { sent, left: readOutbox().length }
    } finally {
      running = null
    }
  })()
  return running
}
