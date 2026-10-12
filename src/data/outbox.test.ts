import { expect, test, vi } from 'vitest'
import { g } from '../test/factories'
import { discardRejected, enqueue, flush, readOutbox, readRejected, type OutboxEntry } from './outbox'

const entry = (id: string): OutboxEntry => ({ id, kind: 'guitarSession', payload: { session: { ...g('2026-10-11', 30), id }, newSongs: [], masteredSongIds: [] } })

test('flush envoie dans l’ordre et vide la file', async () => {
  enqueue(entry('a'))
  enqueue(entry('b'))
  const sent: string[] = []
  expect(await flush(async (e) => void sent.push(e.id))).toEqual({ sent: 2, left: 0 })
  expect(sent).toEqual(['a', 'b'])
  expect(readOutbox()).toEqual([])
})

test('flush s’arrête au premier échec et garde l’entrée et les suivantes', async () => {
  enqueue(entry('a'))
  enqueue(entry('b'))
  enqueue(entry('c'))
  const send = vi.fn(async (e: OutboxEntry) => {
    if (e.id === 'b') throw new Error('offline')
  })
  expect(await flush(send)).toEqual({ sent: 1, left: 2 })
  expect(readOutbox().map((e) => e.id)).toEqual(['b', 'c'])
  expect(send).toHaveBeenCalledTimes(2)
})

test('renvoi d’une entrée déjà reçue : même id, aucune ligne en double', async () => {
  const server = new Map<string, OutboxEntry>()
  let calls = 0
  const send = async (e: OutboxEntry) => {
    server.set(e.id, e) // upsert : le serveur enregistre…
    if (++calls === 1) throw new Error('timeout') // …mais la réponse se perd
  }
  enqueue(entry('a'))
  expect(await flush(send)).toEqual({ sent: 0, left: 1 })
  expect(await flush(send)).toEqual({ sent: 1, left: 0 })
  expect(server.size).toBe(1)
  expect(readOutbox()).toEqual([])
})

test('enqueue remplace une entrée de même id', () => {
  enqueue(entry('a'))
  enqueue(entry('a'))
  expect(readOutbox()).toHaveLength(1)
})

test('localStorage corrompu → file vide, pas d’exception', () => {
  localStorage.setItem('motiv.outbox.v1', '{pas du json')
  expect(readOutbox()).toEqual([])
  localStorage.setItem('motiv.outbox.v1', '{"a":1}')
  expect(readOutbox()).toEqual([])
})

test('deux flush simultanés n’envoient pas deux fois', async () => {
  enqueue(entry('a'))
  const send = vi.fn(async () => {})
  await Promise.all([flush(send), flush(send)])
  expect(send).toHaveBeenCalledTimes(1)
})

test('une correction ajoutée pendant l’envoi reste dans la file', async () => {
  const first = { id: 'a', kind: 'bodyMetric' as const, payload: { id: 'a', day: '2026-10-11', weightKg: 78, waistCm: null, chestCm: null, armCm: null, thighCm: null } }
  enqueue(first)
  const fixed = { ...first, payload: { ...first.payload, weightKg: 77 } }
  await flush(async () => {
    enqueue(fixed)
  })
  expect(readOutbox()).toEqual([fixed])
})

test('un refus définitif du serveur met l’entrée de côté sans bloquer les suivantes', async () => {
  enqueue(entry('a'))
  enqueue(entry('b'))
  const send = vi.fn(async (e: OutboxEntry) => {
    if (e.id === 'a') throw Object.assign(new Error('numeric field overflow'), { code: '22003' })
  })
  expect(await flush(send)).toEqual({ sent: 1, left: 0 })
  expect(readOutbox()).toEqual([])
  expect(readRejected()).toEqual([{ entry: entry('a'), message: 'numeric field overflow' }])
  discardRejected('a')
  expect(readRejected()).toEqual([])
})

test('après un envoi à vide (ouverture de l’appli), les logs suivants partent bien', async () => {
  const send = vi.fn(async () => {})
  expect(await flush(send)).toEqual({ sent: 0, left: 0 })
  enqueue(entry('a'))
  expect(await flush(send)).toEqual({ sent: 1, left: 0 })
  expect(send).toHaveBeenCalledTimes(1)
})
