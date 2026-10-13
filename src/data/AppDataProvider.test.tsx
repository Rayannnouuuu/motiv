import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { EMPTY_DATA, type AppData } from '../domain/types'
import { mkSong } from '../test/factories'
import { useActions, useAppData, type AppDataValue, type GuitarDraft } from './AppDataContext'
import { AppDataProvider } from './AppDataProvider'
import { TABLES, type Rows } from './mappers'
import { readOutbox, readSent } from './outbox'
import { readSnapshot, writeSnapshot } from './snapshot'

type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void

const remote = vi.hoisted(() => ({
  fetchAllRows: vi.fn(),
  writeChallengeUpdates: vi.fn(async () => {}),
  sendEntry: vi.fn(async () => {}),
  deleteSessionRemote: vi.fn(async () => {}),
  saveProgramRemote: vi.fn(async () => {}),
  saveSongRemote: vi.fn(async () => {}),
}))
vi.mock('./remote', () => remote)

const auth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn((_cb: AuthCallback) => ({ data: { subscription: { unsubscribe: () => {} } } })),
  signOut: vi.fn(async () => ({ error: null })),
  updateUser: vi.fn(async () => ({ error: null })),
}))
vi.mock('./supabase', () => ({ supabase: { auth } }))

vi.mock('./push', () => ({ syncPush: vi.fn(async () => {}), disablePush: vi.fn(async () => {}) }))

const SAVED_AT = Date.parse('2026-10-10T08:00:00Z')
const snapData: AppData = { ...EMPTY_DATA, songs: [mkSong({ id: 's-snap', title: 'Paranoid' })] }

/** Réponse serveur : un seul morceau, différent de celui de l'instantané. */
function serverRows(): Rows {
  const rows = Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as Rows
  rows.songs = [{ id: 's-server', title: 'Iron Man', status: 'learning', mastered_on: null }]
  return rows
}

let qc: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={qc}>
    <AppDataProvider>{children}</AppDataProvider>
  </QueryClientProvider>
)

/** Garde chaque valeur rendue, pour vérifier le tout premier rendu. */
function renderProvider() {
  const seen: AppDataValue[] = []
  const hook = renderHook(
    () => {
      const v = useAppData()
      seen.push(v)
      return { ...v, actions: useActions() }
    },
    { wrapper },
  )
  return { ...hook, seen }
}

beforeEach(() => {
  vi.resetAllMocks() // implémentations d'origine : rien ne fuit d'un test à l'autre
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => {
  qc.clear()
  vi.useRealTimers()
})

test('instantané présent, serveur en attente : données dès le premier rendu, sans défis créés', async () => {
  writeSnapshot(snapData, SAVED_AT)
  remote.fetchAllRows.mockReturnValue(new Promise(() => {}))
  const { result, seen } = renderProvider()
  expect(seen[0].data.songs.map((s) => s.id)).toEqual(['s-snap'])
  expect(seen[0].loading).toBe(false)
  expect(seen[0].fresh).toBe(false)
  await waitFor(() => expect(remote.fetchAllRows).toHaveBeenCalled())
  // L'instantané n'a aucun défi : sur des données serveur, il en faudrait. Pas sur l'instantané.
  await act(() => new Promise((r) => setTimeout(r, 20)))
  expect(remote.writeChallengeUpdates).not.toHaveBeenCalled()
  expect(result.current.fresh).toBe(false)
  expect(result.current.offline).toBe(false)
})

test('réponse du serveur : fresh, instantané réécrit, défis réglés', async () => {
  writeSnapshot(snapData, SAVED_AT)
  remote.fetchAllRows.mockResolvedValue(serverRows())
  const { result } = renderProvider()
  await waitFor(() => expect(result.current.fresh).toBe(true))
  expect(result.current.data.songs.map((s) => s.id)).toEqual(['s-server'])
  expect(result.current.offline).toBe(false)
  const snap = readSnapshot()
  expect(snap?.data.songs.map((s) => s.id)).toEqual(['s-server'])
  expect(snap?.savedAt).toBeGreaterThan(SAVED_AT)
  await waitFor(() => expect(remote.writeChallengeUpdates).toHaveBeenCalled())
})

test('l’instantané ne garde que le serveur, pas la file d’envoi', async () => {
  const pendingSession = {
    id: 'g-pending',
    day: '2026-10-12',
    durationMin: 20,
    flowRating: 3,
    desireRating: 3,
    xp: 20,
    createdAt: '2026-10-12T10:00:00Z',
    items: [],
  }
  localStorage.setItem(
    'motiv.outbox.v1',
    JSON.stringify([{ id: 'g-pending', kind: 'guitarSession', payload: { session: pendingSession, newSongs: [], masteredSongIds: [] } }]),
  )
  remote.sendEntry.mockRejectedValue(new TypeError('Failed to fetch')) // reste dans la file
  remote.fetchAllRows.mockResolvedValue(serverRows())
  const { result } = renderProvider()
  await waitFor(() => expect(result.current.fresh).toBe(true))
  expect(result.current.data.guitarSessions.map((s) => s.id)).toEqual(['g-pending'])
  expect(readSnapshot()?.data.guitarSessions).toEqual([])
})

test('serveur injoignable avec instantané : pas d’erreur, hors ligne', async () => {
  writeSnapshot(snapData, SAVED_AT)
  remote.fetchAllRows.mockRejectedValue(new TypeError('Failed to fetch'))
  const { result } = renderProvider()
  await waitFor(() => expect(result.current.offline).toBe(true))
  expect(result.current.error).toBeNull()
  expect(result.current.fresh).toBe(false)
  expect(result.current.data.songs.map((s) => s.id)).toEqual(['s-snap'])
  expect(remote.writeChallengeUpdates).not.toHaveBeenCalled()
  // L'instantané reste celui d'avant.
  expect(readSnapshot()).toEqual({ savedAt: SAVED_AT, data: snapData })
})

test('serveur injoignable sans instantané : erreur', async () => {
  remote.fetchAllRows.mockRejectedValue(new Error('JWT expired'))
  const { result } = renderProvider()
  await waitFor(() => expect(result.current.error).toBe('JWT expired'))
  expect(result.current.offline).toBe(true)
})

test('sans réseau ni instantané : message hors ligne', async () => {
  const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  remote.fetchAllRows.mockRejectedValue(new TypeError('Failed to fetch'))
  const { result } = renderProvider()
  await waitFor(() => expect(result.current.error).toBe('pas de connexion pour le moment. Elles arriveront au retour du réseau.'))
  onLine.mockRestore()
})

test('jeton renouvelé après un démarrage hors ligne : relecture du serveur', async () => {
  writeSnapshot(snapData, SAVED_AT)
  remote.fetchAllRows.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(serverRows())
  const { result } = renderProvider()
  await waitFor(() => expect(result.current.offline).toBe(true))
  const emit = auth.onAuthStateChange.mock.calls.at(-1)![0]
  act(() => emit('TOKEN_REFRESHED', null))
  await waitFor(() => expect(result.current.fresh).toBe(true))
  expect(result.current.offline).toBe(false)
  expect(result.current.data.songs.map((s) => s.id)).toEqual(['s-server'])
})

test('changement de jour : today mis à jour et serveur relu', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-10-12T21:59:50Z')) // 23:59:50 à Paris
  remote.fetchAllRows.mockResolvedValue(serverRows())
  // Les défis ne relancent pas la lecture : seul le changement de jour doit le faire.
  remote.writeChallengeUpdates.mockRejectedValue(new TypeError('Failed to fetch'))
  remote.sendEntry.mockRejectedValue(new TypeError('Failed to fetch'))
  const { result } = renderProvider()
  expect(result.current.today).toBe('2026-10-12')
  await waitFor(() => expect(result.current.fresh).toBe(true))
  await act(() => vi.advanceTimersByTimeAsync(100))
  const fetches = remote.fetchAllRows.mock.calls.length
  // Un log arrivé dans la file sans que le fournisseur le sache : le passage de la file au
  // changement de jour le fait apparaître (il reste en attente, le réseau le refuse).
  localStorage.setItem('motiv.outbox.v1', JSON.stringify([{ id: 'm1', kind: 'bodyMetric', payload: { id: 'm1', day: '2026-10-12' } }]))
  expect(result.current.pendingCount).toBe(0)
  await act(() => vi.advanceTimersByTimeAsync(11_000))
  expect(result.current.today).toBe('2026-10-13')
  await waitFor(() => expect(remote.fetchAllRows.mock.calls.length).toBeGreaterThan(fetches))
  await waitFor(() => expect(result.current.pendingCount).toBe(1))
})

const draft = (over: Partial<GuitarDraft> = {}): GuitarDraft => ({
  id: 'g1',
  day: '2026-10-12',
  durationMin: 30,
  items: [],
  newSongs: [],
  flowRating: 3,
  desireRating: 3,
  ...over,
})

test('envoi réussi mais relecture ratée : le log reste affiché, sans compter comme en attente', async () => {
  remote.fetchAllRows.mockResolvedValueOnce(serverRows()).mockRejectedValue(new TypeError('Failed to fetch'))
  const { result } = renderProvider()
  await waitFor(() => expect(result.current.fresh).toBe(true))
  await act(async () => void (await result.current.actions.saveGuitarSession(draft())))
  await waitFor(() => expect(remote.sendEntry).toHaveBeenCalled())
  await waitFor(() => expect(remote.fetchAllRows.mock.calls.length).toBeGreaterThan(1))
  await act(() => new Promise((r) => setTimeout(r, 20)))
  expect(result.current.pendingCount).toBe(0)
  expect(result.current.data.guitarSessions.map((s) => s.id)).toEqual(['g1'])
  // Gardé sur le téléphone : un relancement hors ligne le montre encore.
  expect(readSent().map((e) => e.id)).toEqual(['g1'])
})

test('lecture réussie après l’envoi : le log vient du serveur, la liste des envois est vidée', async () => {
  const rows = serverRows()
  remote.fetchAllRows.mockResolvedValue(rows)
  remote.sendEntry.mockImplementation(async () => {
    rows.guitar_sessions = [
      { id: 'g1', day: '2026-10-12', duration_min: 30, flow_rating: 3, desire_rating: 3, xp: 30, created_at: '2026-10-12T10:00:00Z' },
    ] as Rows['guitar_sessions']
  })
  const { result } = renderProvider()
  await waitFor(() => expect(result.current.fresh).toBe(true))
  await act(async () => void (await result.current.actions.saveGuitarSession(draft())))
  await waitFor(() => expect(readSent()).toEqual([]))
  expect(result.current.data.guitarSessions.map((s) => s.id)).toEqual(['g1'])
})

test('correction d’un log pas encore envoyé : le morceau qu’il créait n’est pas perdu', async () => {
  remote.fetchAllRows.mockResolvedValue(serverRows())
  remote.sendEntry.mockRejectedValue(new TypeError('Failed to fetch'))
  const { result } = renderProvider()
  await waitFor(() => expect(result.current.fresh).toBe(true))
  const song = mkSong({ id: 's-new', title: 'Wonderwall' })
  const items = [{ kind: 'song' as const, songId: 's-new', markedMastered: false }]
  await act(async () => void (await result.current.actions.saveGuitarSession(draft({ items, newSongs: [song] }))))
  // L'écran de correction ne renvoie que les morceaux créés chez lui : aucun ici.
  await act(async () => void (await result.current.actions.saveGuitarSession(draft({ items, durationMin: 45 }))))
  expect(result.current.data.songs.map((s) => s.id)).toContain('s-new')
  expect(readOutbox()).toHaveLength(1)
  expect(readOutbox()[0]).toMatchObject({ kind: 'guitarSession', payload: { newSongs: [song], session: { durationMin: 45 } } })
})

test('déconnexion : instantané effacé', async () => {
  remote.fetchAllRows.mockResolvedValue(serverRows())
  const { result } = renderProvider()
  await waitFor(() => expect(readSnapshot()).not.toBeNull())
  await act(() => result.current.actions.signOut())
  expect(auth.signOut).toHaveBeenCalled()
  expect(readSnapshot()).toBeNull()
})
