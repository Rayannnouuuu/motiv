import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { todayParis } from '../domain/date'
import { acceptEasier, rerollChallenge, settleChallenges, type Deps } from '../domain/progression'
import { EMPTY_DATA, type AppData, type GuitarSession, type SportSession } from '../domain/types'
import { guitarSessionXp, sportSessionXp } from '../domain/xp'
import { ActionsContext, AppDataContext, type Actions } from './AppDataContext'
import { toAppData } from './mappers'
import { mergePending } from './merge'
import {
  clearSent,
  confirmSent,
  discardRejected,
  enqueue,
  flush,
  readOutbox,
  readRejected,
  readSent,
  removeFromOutbox,
  whenIdle,
  type OutboxEntry,
} from './outbox'
import { disablePush, syncPush } from './push'
import { deleteSessionRemote, fetchAllRows, saveProgramRemote, saveSongRemote, sendEntry, writeChallengeUpdates } from './remote'
import { clearSnapshot, readSnapshot, writeSnapshot } from './snapshot'
import { supabase } from './supabase'
import { useParisDay } from './useParisDay'

const QUERY_KEY = ['appData']
const RETRY_MS = 60_000
const STALE_MS = 5 * 60_000
const NO_NETWORK = 'pas de connexion pour le moment. Elles arriveront au retour du réseau.'
const deps: Deps = { rng: Math.random, newId: () => crypto.randomUUID() }

/** Séance antérieure à celle qu'on enregistre : l'XP (records, progression) ne se compare qu'au passé. */
const isBefore = (s: { day: string; createdAt: string }, day: string, createdAt: string) =>
  s.day < day || (s.day === day && s.createdAt < createdAt)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  // Instantané lu une seule fois : l'appli s'affiche tout de suite, même sans réseau.
  const [snap] = useState(readSnapshot)
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async ({ signal }) => {
      const readStartedAt = Date.now()
      const server = toAppData(await fetchAllRows())
      // Seulement les données serveur, jamais la fusion avec la file d'envoi. Requête annulée
      // (déconnexion pendant le chargement) : rien d'écrit, l'instantané effacé le reste.
      if (!signal.aborted) {
        writeSnapshot(server)
        confirmSent(readStartedAt)
      }
      return server
    },
    initialData: snap?.data,
    initialDataUpdatedAt: snap?.savedAt,
    staleTime: STALE_MS,
    refetchOnMount: 'always', // une vraie lecture serveur à chaque lancement
  })
  const [pending, setPending] = useState<OutboxEntry[]>(readOutbox)
  // Envoyés mais pas encore relus du serveur : affichés comme la file, sans compter « en attente ».
  const [sent, setSent] = useState<OutboxEntry[]>(readSent)
  const [rejected, setRejected] = useState(readRejected)
  const today = useParisDay()

  // Le serveur a répondu depuis le lancement. isFetchedAfterMount compte aussi un échec :
  // la date des données, elle, ne quitte celle de l'instantané qu'à une vraie réponse.
  const fresh = query.isFetchedAfterMount && query.dataUpdatedAt > (snap?.savedAt ?? 0)
  const offline = !fresh && (query.fetchStatus === 'paused' || query.error !== null)
  // Erreur seulement s'il n'y a rien à montrer : avec un instantané, l'appli reste utilisable.
  const failed = query.data === undefined && (query.error !== null || query.fetchStatus === 'paused')
  const error = !failed ? null : !navigator.onLine ? NO_NETWORK : (query.error?.message ?? null)

  const data = useMemo(() => mergePending(query.data ?? EMPTY_DATA, [...sent, ...pending]), [query.data, sent, pending])
  const dataRef = useRef(data)
  dataRef.current = data

  // Chaque lecture réussie confirme les envois qui l'ont précédée (queryFn) : on relit leur liste après.
  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: QUERY_KEY })
    setSent(readSent())
  }, [qc])

  const flushNow = useCallback(async () => {
    const r = await flush(sendEntry)
    // Recharger le serveur avant de retirer les entrées de l'affichage, pour éviter un clignotement.
    if (r.sent > 0) await refresh()
    setPending(readOutbox())
    setSent(readSent())
    setRejected(readRejected())
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

  useEffect(() => {
    syncPush().catch(() => {})
  }, [])

  // Nouveau jour (minuit, ou appli reprise le lendemain) : relire le serveur et renvoyer la file.
  const prevToday = useRef(today)
  useEffect(() => {
    if (prevToday.current === today) return
    prevToday.current = today
    void refresh()
    void flushNow()
  }, [today, refresh, flushNow])

  // Jeton renouvelé ou session retrouvée : souvent le retour du réseau après un démarrage hors ligne.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'TOKEN_REFRESHED' && event !== 'SIGNED_IN') return
      // Différé : supabase déconseille d'appeler ses fonctions depuis ce rappel (verrou de session).
      setTimeout(() => {
        void flushNow()
        void refresh()
      }, 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [flushNow, refresh])

  // Défis : à chaque nouvelle version des données serveur, réussite / blocage / création.
  // Jamais sur l'instantané seul : on risquerait de recréer un défi qui existe déjà sur le serveur.
  const settling = useRef(false)
  useEffect(() => {
    if (!fresh || !query.data || settling.current || !navigator.onLine) return
    const updates = settleChallenges(dataRef.current, today, deps)
    if (updates.length === 0) return
    settling.current = true
    writeChallengeUpdates(updates)
      .then(refresh)
      .catch(() => {})
      .finally(() => {
        settling.current = false
      })
  }, [query.data, fresh, today, refresh])

  const actions = useMemo<Actions>(
    () => ({
      async saveGuitarSession(d) {
        const current = dataRef.current
        // Correction d'un log existant : l'historique s'arrête avant lui (ni lui-même ni les logs suivants),
        // et les morceaux qu'il avait passés en « maîtrisé » redeviennent « en cours » pour le calcul.
        const original = current.guitarSessions.find((s) => s.id === d.id)
        const createdAt = original?.createdAt ?? new Date().toISOString()
        const history = current.guitarSessions.filter((s) => s.id !== d.id && isBefore(s, d.day, createdAt))
        const masteredByOriginal = new Set(original?.items.flatMap((it) => (it.kind === 'song' && it.markedMastered ? [it.songId] : [])))
        const songs = current.songs.map((s) =>
          masteredByOriginal.has(s.id) && s.masteredOn === original?.day ? { ...s, status: 'learning' as const, masteredOn: null } : s,
        )
        const xp = guitarSessionXp(d, history, [...songs, ...d.newSongs])
        const session: GuitarSession = {
          id: d.id,
          day: d.day,
          durationMin: d.durationMin,
          flowRating: d.flowRating,
          desireRating: d.desireRating,
          xp: xp.total,
          createdAt,
          items: d.items,
        }
        const masteredSongIds = d.items.flatMap((it) => (it.kind === 'song' && it.markedMastered ? [it.songId] : []))
        // Correction d'un log pas encore envoyé : les morceaux qu'il créait sont toujours à créer (l'écran
        // de correction ne connaît que les siens), sinon les lignes du log pointeraient vers un morceau absent.
        const queued = readOutbox().find((e) => e.id === d.id)
        const carried = queued?.kind === 'guitarSession' ? queued.payload.newSongs.filter((s) => !d.newSongs.some((n) => n.id === s.id)) : []
        const newSongs = [...carried, ...d.newSongs]
        enqueue({ id: d.id, kind: 'guitarSession', payload: { session, newSongs, masteredSongIds } })
        setPending(readOutbox())
        void flushNow()
        return xp
      },
      async saveSportSession(d) {
        const current = dataRef.current
        const names = new Map(current.programs.flatMap((p) => p.exercises.map((e) => [e.id, e.name] as const)))
        const original = current.sportSessions.find((s) => s.id === d.id)
        const createdAt = original?.createdAt ?? new Date().toISOString()
        const history = current.sportSessions.filter((s) => s.id !== d.id && isBefore(s, d.day, createdAt))
        const xp = sportSessionXp(d, history, (id) => names.get(id) ?? 'Exo inconnu')
        const session: SportSession = { ...d, xp: xp.total, createdAt }
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
      async deleteLog(kind, id) {
        if (!navigator.onLine) {
          const server = qc.getQueryData<AppData>(QUERY_KEY)
          const onServer = (kind === 'guitar' ? server?.guitarSessions : server?.sportSessions)?.some((s) => s.id === id) || readSent().some((e) => e.id === id)
          // Vérifié avant de toucher la file : une correction en attente n'est pas perdue si la suppression échoue.
          if (onServer) throw new Error('Connexion nécessaire pour supprimer ce log')
          removeFromOutbox(id)
          setPending(readOutbox())
          setSent(readSent())
          return
        }
        // Un envoi en cours de ce log arriverait après la suppression et le ferait réapparaître : on l'attend.
        await whenIdle()
        removeFromOutbox(id)
        setPending(readOutbox())
        setSent(readSent())
        await deleteSessionRemote(kind, id) // sans effet s'il n'a jamais atteint le serveur
        await refresh()
      },
      discardRejected(id) {
        discardRejected(id)
        setRejected(readRejected())
      },
      async setPassword(password) {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw new Error(error.message)
      },
      async signOut() {
        // Plus de rappels sur un appareil déconnecté.
        await disablePush().catch(() => {})
        await supabase.auth.signOut()
        clearSnapshot()
        clearSent()
        qc.clear()
      },
    }),
    [flushNow, refresh, qc],
  )

  const value = useMemo(
    () => ({
      data,
      pendingCount: pending.length,
      rejected,
      today,
      loading: query.isPending,
      fresh,
      offline,
      error,
    }),
    [data, pending.length, rejected, today, query.isPending, fresh, offline, error],
  )

  return (
    <AppDataContext.Provider value={value}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </AppDataContext.Provider>
  )
}
