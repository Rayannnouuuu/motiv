import type { ChallengeUpdate } from '../domain/progression'
import type { Challenge, Program, Song } from '../domain/types'
import {
  bodyMetricToRow,
  challengeToRow,
  guitarSessionToRows,
  programToRows,
  songToRow,
  sportSessionToRows,
  TABLES,
  type Rows,
} from './mappers'
import type { OutboxEntry } from './outbox'
import { supabase } from './supabase'

const PAGE = 1000 // limite par requête de PostgREST

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

async function fetchTable<K extends keyof Rows>(table: K): Promise<Rows[K]> {
  const all: Rows[K][number][] = []
  for (let from = 0; ; from += PAGE) {
    const page = check(await supabase.from(table).select('*').order('id').range(from, from + PAGE - 1)) as Rows[K]
    all.push(...page)
    if (page.length < PAGE) return all as Rows[K]
  }
}

export async function fetchAllRows(): Promise<Rows> {
  const results = await Promise.all(TABLES.map((t) => fetchTable(t)))
  return Object.fromEntries(TABLES.map((t, i) => [t, results[i]])) as unknown as Rows
}

async function upsert(table: keyof Rows, rows: object | object[]) {
  if (Array.isArray(rows) && rows.length === 0) return
  check(await supabase.from(table).upsert(rows))
}

/** Supprime les lignes enfants qui ne font plus partie d'une session corrigée. */
async function deleteOrphans(table: 'guitar_session_items' | 'sport_sets', sessionId: string, keep: string[]) {
  let q = supabase.from(table).delete().eq('session_id', sessionId)
  if (keep.length > 0) q = q.not('id', 'in', `(${keep.join(',')})`)
  check(await q)
}

export async function deleteSessionRemote(kind: 'guitar' | 'sport', id: string): Promise<void> {
  // Les items / séries partent avec la session (on delete cascade).
  check(await supabase.from(kind === 'guitar' ? 'guitar_sessions' : 'sport_sessions').delete().eq('id', id))
}

/** Envoi idempotent d'une entrée de la file hors-ligne (upserts par id). */
export async function sendEntry(e: OutboxEntry): Promise<void> {
  if (e.kind === 'guitarSession') {
    const { session, newSongs, masteredSongIds } = e.payload
    await upsert(
      'songs',
      newSongs.map((s) =>
        songToRow(masteredSongIds.includes(s.id) ? { ...s, status: 'mastered', masteredOn: session.day } : s),
      ),
    )
    const existing = masteredSongIds.filter((id) => !newSongs.some((s) => s.id === id))
    if (existing.length > 0)
      check(
        await supabase
          .from('songs')
          .update({ status: 'mastered', mastered_on: session.day })
          .in('id', existing)
          .eq('status', 'learning'),
      )
    const rows = guitarSessionToRows(session)
    await upsert('guitar_sessions', rows.session)
    await upsert('guitar_session_items', rows.items)
    await deleteOrphans('guitar_session_items', session.id, rows.items.map((r) => r.id))
  } else if (e.kind === 'sportSession') {
    const rows = sportSessionToRows(e.payload)
    await upsert('sport_sessions', rows.session)
    await upsert('sport_sets', rows.sets)
    await deleteOrphans('sport_sets', e.payload.id, rows.sets.map((r) => r.id))
  } else {
    await upsert('body_metrics', bodyMetricToRow(e.payload))
  }
}

export async function saveSongRemote(s: Song): Promise<void> {
  await upsert('songs', songToRow(s))
}

export async function saveProgramRemote(p: Program): Promise<void> {
  const rows = programToRows(p)
  await upsert('sport_programs', rows.program)
  await upsert('program_exercises', rows.exercises)
}

export async function writeChallengeUpdates(updates: ChallengeUpdate[]): Promise<void> {
  for (const u of updates) {
    if (u.type === 'create') await upsert('challenges', challengeToRow(u.challenge as Challenge))
    else {
      const patch =
        u.type === 'markDone' ? { status: 'done', done_on: u.doneOn } : u.type === 'replace' ? { status: 'replaced' } : { blocked_since: u.day }
      check(await supabase.from('challenges').update(patch).eq('id', u.id))
    }
  }
}
