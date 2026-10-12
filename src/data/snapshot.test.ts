import { afterEach, expect, test, vi } from 'vitest'
import { mkSong } from '../test/factories'
import { EMPTY_DATA } from '../domain/types'
import { clearSnapshot, readSnapshot, writeSnapshot } from './snapshot'

const KEY = 'motiv.snapshot.v1'

afterEach(() => vi.restoreAllMocks())

test('aller-retour, puis effacement', () => {
  const data = { ...EMPTY_DATA, songs: [mkSong({ title: 'Paranoid' })] }
  writeSnapshot(data, 1_700_000_000_000)
  expect(readSnapshot()).toEqual({ savedAt: 1_700_000_000_000, data })
  clearSnapshot()
  expect(readSnapshot()).toBeNull()
})

test('rien d’enregistré → null', () => {
  expect(readSnapshot()).toBeNull()
})

test('JSON corrompu → null', () => {
  localStorage.setItem(KEY, '{pas du json')
  expect(readSnapshot()).toBeNull()
})

test('contenu invalide → null', () => {
  localStorage.setItem(KEY, JSON.stringify([1, 2]))
  expect(readSnapshot()).toBeNull()
  localStorage.setItem(KEY, JSON.stringify({ savedAt: 'hier', data: EMPTY_DATA }))
  expect(readSnapshot()).toBeNull()
})

test('un tableau manquant → null', () => {
  const { challenges: _challenges, ...partial } = EMPTY_DATA
  localStorage.setItem(KEY, JSON.stringify({ savedAt: 1, data: partial }))
  expect(readSnapshot()).toBeNull()
})

test('stockage plein : aucune exception', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('quota', 'QuotaExceededError')
  })
  expect(() => writeSnapshot(EMPTY_DATA)).not.toThrow()
  expect(readSnapshot()).toBeNull()
})

test('stockage indisponible : lecture et effacement sans exception', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('denied', 'SecurityError')
  })
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
    throw new DOMException('denied', 'SecurityError')
  })
  expect(readSnapshot()).toBeNull()
  expect(() => clearSnapshot()).not.toThrow()
})
