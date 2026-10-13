import type { BodyMetric, GuitarSession, Song, SportSession } from '../domain/types'

export type OutboxEntry =
  | { id: string; kind: 'guitarSession'; payload: { session: GuitarSession; newSongs: Song[]; masteredSongIds: string[] } }
  | { id: string; kind: 'sportSession'; payload: SportSession }
  | { id: string; kind: 'bodyMetric'; payload: BodyMetric }

const KEY = 'motiv.outbox.v1'
const REJECTED_KEY = 'motiv.outbox.rejected.v1'
const SENT_KEY = 'motiv.outbox.sent.v1'

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

/** Une correction garde la place de l'entrée qu'elle remplace : un log suivant peut dépendre d'elle (morceau créé). */
export function enqueue(e: OutboxEntry): void {
  const list = readOutbox()
  const i = list.findIndex((x) => x.id === e.id)
  if (i >= 0) list[i] = e
  else list.push(e)
  write(list)
}

/** Oublie tout ce qui reste sur le téléphone pour ce log : en attente d'envoi ou envoyé pas encore relu. */
export function removeFromOutbox(id: string): void {
  write(readOutbox().filter((x) => x.id !== id))
  writeSent(readSentRaw().filter((x) => x.entry.id !== id))
}

/**
 * Entrées envoyées que le serveur n'a pas encore renvoyées en lecture. Réseau capricieux : l'envoi passe,
 * la relecture qui suit échoue ; sans cette liste, le log disparaîtrait de l'écran jusqu'à la prochaine lecture.
 */
interface SentEntry {
  entry: OutboxEntry
  sentAt: number
}

function readSentRaw(): SentEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SENT_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as SentEntry[]) : []
  } catch {
    return []
  }
}

function writeSent(list: SentEntry[]) {
  if (list.length === 0) localStorage.removeItem(SENT_KEY)
  else localStorage.setItem(SENT_KEY, JSON.stringify(list))
}

export function readSent(): OutboxEntry[] {
  return readSentRaw().map((x) => x.entry)
}

/** Lecture serveur réussie, commencée à `readStartedAt` : tout ce qui a été envoyé avant y figure. */
export function confirmSent(readStartedAt: number): void {
  const list = readSentRaw()
  const left = list.filter((x) => x.sentAt >= readStartedAt)
  if (left.length !== list.length) writeSent(left)
}

export function clearSent(): void {
  localStorage.removeItem(SENT_KEY)
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
    // Gardé pour l'affichage jusqu'à ce qu'une lecture du serveur le contienne.
    writeSent([...readSentRaw().filter((x) => x.entry.id !== e.id), { entry: e, sentAt: Date.now() }])
    // Retire seulement la version envoyée : une correction ajoutée pendant l'envoi reste dans la file.
    const sentJson = JSON.stringify(e)
    write(readOutbox().filter((x) => x.id !== e.id || JSON.stringify(x) !== sentJson))
    sent++
  }
  return { sent, left: readOutbox().length }
}
