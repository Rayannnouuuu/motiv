import { beforeEach, expect, test, vi } from 'vitest'
import { isPermanentError } from './outbox'
import { g } from '../test/factories'

const sb = vi.hoisted(() => ({
  auth: { getSession: vi.fn() },
  from: vi.fn(),
}))
vi.mock('./supabase', () => ({ supabase: sb }))

const { fetchAllRows, NO_SESSION, sendEntry } = await import('./remote')

beforeEach(() => vi.clearAllMocks())

test('sans session (jeton expiré hors ligne) : aucune requête avec la clé anonyme', async () => {
  sb.auth.getSession.mockResolvedValue({ data: { session: null } })
  await expect(fetchAllRows()).rejects.toThrow(NO_SESSION)
  const send = sendEntry({ id: 'a', kind: 'guitarSession', payload: { session: g('2026-10-15', 30), newSongs: [], masteredSongIds: [] } })
  await expect(send).rejects.toThrow(NO_SESSION)
  expect(sb.from).not.toHaveBeenCalled()
  // Erreur passagère : la file d'envoi garde le log et réessaiera.
  expect(isPermanentError(await send.catch((e) => e))).toBe(false)
})
