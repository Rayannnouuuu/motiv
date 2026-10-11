import { expect, test, vi } from 'vitest'
import { g } from '../test/factories'
import { enqueue, flush, readOutbox, type OutboxEntry } from './outbox'

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
