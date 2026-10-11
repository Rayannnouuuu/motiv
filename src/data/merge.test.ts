import { expect, test } from 'vitest'
import { data, g, mkSong, ss } from '../test/factories'
import { mergePending } from './merge'
import type { OutboxEntry } from './outbox'

test('une session en attente apparaît dans AppData, sans doublon si le serveur l’a déjà', () => {
  const s = g('2026-10-11', 30)
  const pending: OutboxEntry[] = [{ id: s.id, kind: 'guitarSession', payload: { session: s, newSongs: [], masteredSongIds: [] } }]
  expect(mergePending(data(), pending).guitarSessions).toEqual([s])
  expect(mergePending(data({ guitarSessions: [s] }), pending).guitarSessions).toEqual([s])
})

test('newSongs et masteredSongIds en attente sont appliqués aux songs', () => {
  const existing = mkSong({ id: 'old' })
  const created = mkSong({ id: 'new', title: 'Walk' })
  const s = g('2026-10-11', 30)
  const pending: OutboxEntry[] = [{ id: s.id, kind: 'guitarSession', payload: { session: s, newSongs: [created], masteredSongIds: ['old'] } }]
  const songs = mergePending(data({ songs: [existing] }), pending).songs
  expect(songs).toEqual([{ ...existing, status: 'mastered', masteredOn: '2026-10-11' }, created])
})

test('séance sport et mesure en attente', () => {
  const s = ss([], '2026-10-11')
  const m = { id: 'm1', day: '2026-10-11', weightKg: 78, waistCm: null, chestCm: null, armCm: null, thighCm: null }
  const merged = mergePending(data(), [
    { id: s.id, kind: 'sportSession', payload: s },
    { id: 'm1', kind: 'bodyMetric', payload: m },
  ])
  expect(merged.sportSessions).toEqual([s])
  expect(merged.bodyMetrics).toEqual([m])
})
