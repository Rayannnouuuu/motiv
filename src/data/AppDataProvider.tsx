import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { movementKey } from '../content/sportLibrary'
import { todayParis } from '../domain/date'
import type * as V1 from '../domain/model'
import { acceptEasier, applyChallengeUpdates, rerollChallenge, settleChallenges, type ChallengeUpdate, type Deps } from '../domain/progression'
import { EMPTY_DATA, type AppData, type GuitarSession, type SportSession } from '../domain/types'
import { guitarSessionXp, sportSessionXp } from '../domain/xp'
import { ActionsContext, AppDataContext, DbContext, type Actions } from './AppDataContext'
import { loadAll, write, type DeviceMeta, type MotivDb } from './db'
import { toAppData } from './migrations/project'
import { challengeToV1, guitarSessionToV1, measurementToV1, movementFor, programToTemplate, songToV1, sportSessionToV1 } from './migrations/v0ToV1'
import { ensurePersisted } from './persist'
import { useParisDay } from './useParisDay'

const deps: Deps = { rng: Math.random, newId: () => crypto.randomUUID() }

/** Séance antérieure à celle qu'on enregistre : l'XP (records, progression) ne se compare qu'au passé. */
const isBefore = (s: { day: string; createdAt: string }, day: string, createdAt: string) =>
  s.day < day || (s.day === day && s.createdAt < createdAt)

type Loaded = { ok: true; data: V1.DataV1; meta: DeviceMeta } | { ok: false; error: string }

/**
 * Mouvement de chaque ancien id d'exo de programme, d'après mes modèles de séance. Un id inconnu (exo
 * disparu) reçoit un mouvement « inconnu » à part, comme à la migration : la série n'est jamais perdue.
 */
function exerciseResolver(v1: V1.DataV1) {
  const byEntry = new Map(v1.templates.flatMap((t) => t.blocks.flatMap((b) => b.entries)).map((e) => [e.id, e.exerciseId] as const))
  const movements = v1.exercises.map((m) => ({ ...m }))
  return {
    exerciseOf: (peId: string) => byEntry.get(peId) ?? movementFor(`Exo inconnu ${peId.slice(0, 8)}`, movements).id,
    created: () => movements.slice(v1.exercises.length),
  }
}

/**
 * Mes données, lues en direct dans la base du téléphone (Dexie). Les écrans du lot 1 reçoivent l'ancienne
 * forme, recalculée ; chaque action écrit en une seule transaction. Tant qu'il n'y a eu ni import ni
 * « Commencer sans données », `welcome` s'affiche à la place de l'appli.
 */
export function AppDataProvider({ db, welcome, children }: { db: MotivDb; welcome: ReactNode; children: ReactNode }) {
  const loaded = useLiveQuery(async (): Promise<Loaded> => {
    try {
      return { ok: true, ...(await loadAll(db)) }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'lecture impossible' }
    }
  }, [db])
  const today = useParisDay()
  const v1 = loaded?.ok ? loaded.data : null
  const initialized = loaded?.ok === true && loaded.meta.initializedAt !== null
  const data = useMemo<AppData>(() => (v1 ? toAppData(v1) : EMPTY_DATA), [v1])
  // Lu par les actions (après le rendu) : toujours la dernière version des données.
  const current = useRef({ v1, data })
  useLayoutEffect(() => {
    current.current = { v1, data }
  })

  const { actions, settle } = useMemo(() => {
    const now = () => new Date().toISOString()
    const state = () => {
      const { v1, data } = current.current
      if (!v1) throw new Error('Données pas encore chargées')
      return { v1, data }
    }
    async function writeChallenges(updates: ChallengeUpdate[]) {
      if (updates.length === 0) return
      const { v1, data } = state()
      const r = exerciseResolver(v1)
      const next = applyChallengeUpdates(data.challenges, updates).map((c) => challengeToV1(c, r.exerciseOf))
      await write(db, now(), async () => {
        await db.challenges.bulkPut(next)
        await db.exercises.bulkPut(r.created())
      })
    }
    const actions: Actions = {
      async saveGuitarSession(d) {
        const { v1, data } = state()
        // Correction d'un log existant : l'historique s'arrête avant lui (ni lui-même ni les logs suivants),
        // et les morceaux qu'il avait passés en « maîtrisé » redeviennent « en cours » pour le calcul.
        const original = data.guitarSessions.find((s) => s.id === d.id)
        const createdAt = original?.createdAt ?? now()
        const history = data.guitarSessions.filter((s) => s.id !== d.id && isBefore(s, d.day, createdAt))
        const masteredByOriginal = new Set(original?.items.flatMap((it) => (it.kind === 'song' && it.markedMastered ? [it.songId] : [])))
        const songs = data.songs.map((s) =>
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
        const mastered = new Set(d.items.flatMap((it) => (it.kind === 'song' && it.markedMastered ? [it.songId] : [])))
        const played = new Set(d.items.flatMap((it) => (it.kind === 'song' ? [it.songId] : [])))
        const newIds = new Set(d.newSongs.map((s) => s.id))
        await write(db, now(), async () => {
          await db.sessions.put(guitarSessionToV1(session))
          for (const s of d.newSongs)
            await db.songs.put(songToV1(mastered.has(s.id) ? { ...s, status: 'mastered', masteredOn: d.day } : s, true))
          // Comme le serveur : un morceau coché passe « maîtrisé » ce jour-là s'il ne l'était pas déjà.
          for (const s of v1.songs) {
            if (newIds.has(s.id)) continue
            if (mastered.has(s.id) && s.status !== 'mastered' && s.status !== 'maintain') await db.songs.put({ ...s, status: 'mastered', masteredOn: d.day })
            else if (played.has(s.id) && s.status === 'to_learn') await db.songs.put({ ...s, status: 'learning' })
          }
        })
        void ensurePersisted()
        return xp
      },
      async saveSportSession(d) {
        const { v1, data } = state()
        const names = new Map(data.programs.flatMap((p) => p.exercises.map((e) => [e.id, e.name] as const)))
        const original = data.sportSessions.find((s) => s.id === d.id)
        const createdAt = original?.createdAt ?? now()
        const history = data.sportSessions.filter((s) => s.id !== d.id && isBefore(s, d.day, createdAt))
        const xp = sportSessionXp(d, history, (id) => names.get(id) ?? 'Exo inconnu')
        const session: SportSession = { ...d, xp: xp.total, createdAt }
        const r = exerciseResolver(v1)
        const row = sportSessionToV1(session, r.exerciseOf)
        await write(db, now(), async () => {
          await db.sessions.put(row)
          await db.exercises.bulkPut(r.created())
        })
        void ensurePersisted()
        return xp
      },
      async saveBodyMetric(m) {
        await write(db, now(), async () => {
          await db.measurements.put(measurementToV1(m))
        })
      },
      async saveSong(s) {
        const { v1, data } = state()
        const played = data.guitarSessions.some((g) => g.items.some((it) => it.kind === 'song' && it.songId === s.id))
        const row = songToV1(s, played, v1.songs.find((x) => x.id === s.id))
        await write(db, now(), async () => {
          await db.songs.put(row)
        })
      },
      async saveProgram(p) {
        const { v1 } = state()
        const movements = v1.exercises.map((m) => ({ ...m }))
        const before = new Map(v1.templates.find((t) => t.id === p.id)?.blocks.flatMap((b) => b.entries).map((e) => [e.id, e] as const))
        // Un exo renommé (autre nom que son mouvement) retrouve son mouvement ; sinon il garde le sien.
        const exerciseOf = (peId: string) => {
          const pe = p.exercises.find((e) => e.id === peId)!
          const prev = before.get(peId)
          return prev && movementKey(prev.name) === movementKey(pe.name) ? prev.exerciseId : movementFor(pe.name, movements).id
        }
        const template = programToTemplate(p, exerciseOf)
        await write(db, now(), async () => {
          await db.templates.put(template)
          await db.exercises.bulkPut(movements.slice(v1.exercises.length))
        })
      },
      async rerollChallenge(id) {
        await writeChallenges(rerollChallenge(state().data, id, todayParis(), deps))
      },
      async acceptEasier(id) {
        await writeChallenges(acceptEasier(state().data, id, todayParis(), deps))
      },
      async deleteLog(_kind, id) {
        await write(db, now(), async () => {
          await db.sessions.delete(id)
        })
      },
      async saveMovement(m) {
        await write(db, now(), async () => {
          await db.exercises.put(m)
        })
      },
    }
    return { actions, settle: writeChallenges }
  }, [db])

  // Défis : à chaque nouvelle version des données, réussite / blocage / création. Jamais avant le premier import.
  const settling = useRef(false)
  useEffect(() => {
    if (!initialized || settling.current) return
    const updates = settleChallenges(data, today, deps)
    if (updates.length === 0) return
    settling.current = true
    settle(updates)
      .catch(() => {})
      .finally(() => {
        settling.current = false
      })
  }, [data, initialized, today, settle])

  const value = useMemo(() => ({ data, movements: v1?.exercises ?? [], today }), [data, v1, today])

  if (loaded === undefined) return null
  if (!loaded.ok)
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-6 text-center">
        <h1 className="t-title">Lecture impossible</h1>
        <p className="t-body text-muted">Tes données sont sur ce téléphone mais n'ont pas pu être lues ({loaded.error}). Rien n'est effacé : relance l'appli.</p>
      </main>
    )
  return (
    <DbContext.Provider value={db}>
      {initialized ? (
        <AppDataContext.Provider value={value}>
          <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
        </AppDataContext.Provider>
      ) : (
        welcome
      )}
    </DbContext.Provider>
  )
}
