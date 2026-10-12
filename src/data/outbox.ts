import type { BodyMetric, GuitarSession, Song, SportSession } from '../domain/types'

export type OutboxEntry =
  | { id: string; kind: 'guitarSession'; payload: { session: GuitarSession; newSongs: Song[]; masteredSongIds: string[] } }
  | { id: string; kind: 'sportSession'; payload: SportSession }
  | { id: string; kind: 'bodyMetric'; payload: BodyMetric }

const KEY = 'motiv.outbox.v1'
const REJECTED_KEY = 'motiv.outbox.rejected.v1'

/** Entrée refusée définitivement par le serveur (donnée invalide) : sortie de la file pour ne pas la bloquer. */
export interface RejectedEntry {
  entry: OutboxEntry
  message: string
}

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

export function readRejected(): RejectedEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(REJECTED_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as RejectedEntry[]) : []
  } catch {
    return []
  }
}

export function discardRejected(id: string): void {
  localStorage.setItem(REJECTED_KEY, JSON.stringify(readRejected().filter((r) => r.entry.id !== id)))
}

/** Erreur que réessayer ne corrigera pas : donnée invalide (22xxx), contrainte (23xxx), droits / schéma (42xxx). */
export function isPermanentError(e: unknown): boolean {
  const code = (e as { code?: unknown })?.code
  return typeof code === 'string' && /^(22|23|42)/.test(code)
}

export function enqueue(e: OutboxEntry): void {
  write([...readOutbox().filter((x) => x.id !== e.id), e])
}

export function removeFromOutbox(id: string): void {
  write(readOutbox().filter((x) => x.id !== id))
}

let running: Promise<{ sent: number; left: number }> | null = null

/** Attend la fin de l'envoi en cours, s'il y en a un. */
export async function whenIdle(): Promise<void> {
  await running
}

/**
 * Envoie les entrées dans l'ordre. Un échec réseau arrête l'envoi (l'entrée et les suivantes restent) ;
 * un refus définitif du serveur met l'entrée de côté et passe à la suivante.
 */
export function flush(send: (e: OutboxEntry) => Promise<void>): Promise<{ sent: number; left: number }> {
  if (running) return running
  // Libéré après coup (microtâche) : avec une file vide, la fonction se termine sans attendre, et un
  // `finally` interne remettrait `running` à null AVANT qu'on l'affecte, le laissant bloqué pour toujours.
  const current = sendAll(send).finally(() => {
    if (running === current) running = null
  })
  running = current
  return current
}

async function sendAll(send: (e: OutboxEntry) => Promise<void>): Promise<{ sent: number; left: number }> {
  let sent = 0
  for (const e of readOutbox()) {
    try {
      await send(e)
    } catch (err) {
      if (!isPermanentError(err)) break
      localStorage.setItem(REJECTED_KEY, JSON.stringify([...readRejected(), { entry: e, message: (err as Error).message }]))
      write(readOutbox().filter((x) => x.id !== e.id))
      continue
    }
    // Retire seulement la version envoyée : une correction ajoutée pendant l'envoi reste dans la file.
    const sentJson = JSON.stringify(e)
    write(readOutbox().filter((x) => x.id !== e.id || JSON.stringify(x) !== sentJson))
    sent++
  }
  return { sent, left: readOutbox().length }
}
