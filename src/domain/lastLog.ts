import type { AppData, GuitarSession, SportSession } from './types'

export type LastLog = { kind: 'guitar'; session: GuitarSession } | { kind: 'sport'; session: SportSession }

/** Dernier log enregistré (guitare ou sport), d'après l'heure d'enregistrement. */
export function lastLog(data: Pick<AppData, 'guitarSessions' | 'sportSessions'>): LastLog | null {
  let best: LastLog | null = null
  for (const session of data.guitarSessions) if (!best || session.createdAt > best.session.createdAt) best = { kind: 'guitar', session }
  for (const session of data.sportSessions) if (!best || session.createdAt > best.session.createdAt) best = { kind: 'sport', session }
  return best
}
