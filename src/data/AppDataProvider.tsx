import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { todayParis } from '../domain/date'
import { acceptEasier, rerollChallenge, settleChallenges, type Deps } from '../domain/progression'
import { EMPTY_DATA, type GuitarSession, type SportSession } from '../domain/types'
import { guitarSessionXp, sportSessionXp } from '../domain/xp'
import { ActionsContext, AppDataContext, type Actions } from './AppDataContext'
import { toAppData } from './mappers'
import { mergePending } from './merge'
import { enqueue, flush, readOutbox, type OutboxEntry } from './outbox'
import { fetchAllRows, saveProgramRemote, saveSongRemote, sendEntry, writeChallengeUpdates } from './remote'
import { supabase } from './supabase'

const QUERY_KEY = ['appData']
const RETRY_MS = 60_000
const deps: Deps = { rng: Math.random, newId: () => crypto.randomUUID() }

export function AppDataProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: async () => toAppData(await fetchAllRows()) })
  const [pending, setPending] = useState<OutboxEntry[]>(readOutbox)
  const today = todayParis()

  const data = useMemo(() => mergePending(query.data ?? EMPTY_DATA, pending), [query.data, pending])
  const dataRef = useRef(data)
  dataRef.current = data

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: QUERY_KEY }), [qc])

  const flushNow = useCallback(async () => {
    const r = await flush(sendEntry)
    // Recharger le serveur avant de retirer les entrées de l'affichage, pour éviter un clignotement.
    if (r.sent > 0) await refresh()
    setPending(readOutbox())
  }, [refresh])

  // Envoi de la file : au montage, au retour du réseau, puis toutes les 60 s tant qu'elle n'est pas vide.
  useEffect(() => {
    void flushNow()
    const onOnline = () => void flushNow()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [flushNow])
  useEffect(() => {
    if (pending.length === 0) return
    const t = setInterval(() => void flushNow(), RETRY_MS)
    return () => clearInterval(t)
  }, [pending.length, flushNow])

  // Défis : à chaque nouvelle version des données serveur, réussite / blocage / création.
  const settling = useRef(false)
  useEffect(() => {
    if (!query.data || settling.current || !navigator.onLine) return
    const updates = settleChallenges(dataRef.current, todayParis(), deps)
    if (updates.length === 0) return
    settling.current = true
    writeChallengeUpdates(updates)
      .then(refresh)
      .catch(() => {})
      .finally(() => {
        settling.current = false
      })
  }, [query.data, refresh])

  const actions = useMemo<Actions>(
    () => ({
      async saveGuitarSession(d) {
        const current = dataRef.current
        const xp = guitarSessionXp(d, current.guitarSessions, [...current.songs, ...d.newSongs])
        const session: GuitarSession = {
          id: d.id,
          day: d.day,
          durationMin: d.durationMin,
          flowRating: d.flowRating,
          desireRating: d.desireRating,
          xp: xp.total,
          createdAt: new Date().toISOString(),
          items: d.items,
        }
        const masteredSongIds = d.items.flatMap((it) => (it.kind === 'song' && it.markedMastered ? [it.songId] : []))
        enqueue({ id: d.id, kind: 'guitarSession', payload: { session, newSongs: d.newSongs, masteredSongIds } })
        setPending(readOutbox())
        void flushNow()
        return xp
      },
      async saveSportSession(d) {
        const current = dataRef.current
        const names = new Map(current.programs.flatMap((p) => p.exercises.map((e) => [e.id, e.name] as const)))
        const xp = sportSessionXp(d, current.sportSessions, (id) => names.get(id) ?? 'Exo inconnu')
        const session: SportSession = { ...d, xp: xp.total, createdAt: new Date().toISOString() }
        enqueue({ id: d.id, kind: 'sportSession', payload: session })
        setPending(readOutbox())
        void flushNow()
        return xp
      },
      async saveBodyMetric(m) {
        enqueue({ id: m.id, kind: 'bodyMetric', payload: m })
        setPending(readOutbox())
        void flushNow()
      },
      async saveSong(s) {
        await saveSongRemote(s)
        await refresh()
      },
      async saveProgram(p) {
        await saveProgramRemote(p)
        await refresh()
      },
      async rerollChallenge(id) {
        await writeChallengeUpdates(rerollChallenge(dataRef.current, id, todayParis(), deps))
        await refresh()
      },
      async acceptEasier(id) {
        await writeChallengeUpdates(acceptEasier(dataRef.current, id, todayParis(), deps))
        await refresh()
      },
      async setPassword(password) {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw new Error(error.message)
      },
      async signOut() {
        await supabase.auth.signOut()
        qc.clear()
      },
    }),
    [flushNow, refresh, qc],
  )

  const value = useMemo(
    () => ({
      data,
      pendingCount: pending.length,
      today,
      loading: query.isPending,
      error: query.error ? query.error.message : null,
    }),
    [data, pending.length, today, query.isPending, query.error],
  )

  return (
    <AppDataContext.Provider value={value}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </AppDataContext.Provider>
  )
}
