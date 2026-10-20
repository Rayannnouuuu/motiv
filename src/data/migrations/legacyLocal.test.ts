import { expect, test } from 'vitest'
import { data, g, mkSong, ss } from '../../test/factories'
import { mergePending, readLegacyLocal } from './legacyLocal'
import type { OutboxEntry } from './legacyLocal'

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

test('un log corrigé en attente remplace la version du serveur', () => {
  const s = g('2026-10-11', 30)
  const fixed = { ...s, durationMin: 45 }
  const pending: OutboxEntry[] = [{ id: s.id, kind: 'guitarSession', payload: { session: fixed, newSongs: [], masteredSongIds: [] } }]
  expect(mergePending(data({ guitarSessions: [s] }), pending).guitarSessions).toEqual([fixed])
})

test('ancienne version sur le téléphone : instantané + file d’envoi relus en sauvegarde format 0', () => {
  const server = g('2026-10-11', 30)
  const queued = g('2026-10-12', 45)
  localStorage.setItem('motiv.snapshot.v1', JSON.stringify({ savedAt: Date.UTC(2026, 9, 12, 8), data: data({ guitarSessions: [server] }) }))
  localStorage.setItem(
    'motiv.outbox.v1',
    JSON.stringify([{ id: queued.id, kind: 'guitarSession', payload: { session: queued, newSongs: [], masteredSongIds: [] } }]),
  )
  const found = readLegacyLocal()
  expect(found?.pending).toBe(1)
  expect(found?.backup).toMatchObject({ app: 'motiv', schemaVersion: 0, exportedAt: '2026-10-12T08:00:00.000Z' })
  expect(found?.backup.data.guitarSessions).toEqual([server, queued])
  expect(localStorage.getItem('motiv.snapshot.v1')).not.toBeNull()
})

test('rien de l’ancienne version : null', () => {
  expect(readLegacyLocal()).toBeNull()
  localStorage.setItem('motiv.snapshot.v1', '{"savedAt":1,"data":{}}')
  expect(readLegacyLocal()).toBeNull()
})
