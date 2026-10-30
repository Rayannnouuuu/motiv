import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { movementKey } from '../content/sportLibrary'
import { todayParis, weekStart } from '../domain/date'
import { EMPTY_DATA_V1 } from '../domain/model'
import { betterChrono } from '../domain/marathon/paces'
import { isRunEntry, RUN_MOVEMENT_ID } from '../domain/marathon/runs'
import { doneRuns } from '../domain/marathon/runs'
import { RUNNER_TEMPLATE_ID, runnerMoves, runnerTemplateName } from '../domain/marathon/strength'
import type * as V1 from '../domain/model'
import { acceptEasier, applyChallengeUpdates, rerollChallenge, settleChallenges, type ChallengeUpdate, type Deps } from '../domain/progression'
import { EMPTY_DATA, type AppData, type GuitarSession, type SportSession } from '../domain/types'
import { objective, type Cycle } from '../domain/cycles'
import { WEEK_XP_FROM } from '../domain/levels'
import { guitarSessionXp, runXp, sportSessionXp } from '../domain/xp'
import { ActionsContext, AppDataContext, DbContext, type Actions } from './AppDataContext'
import { loadAll, write, type DeviceMeta, type MotivDb } from './db'
import { sportByMovement, toAppData } from './migrations/project'
import {
  challengeToV1,
  guitarSessionToV1,
  LIBRARY_MOVEMENTS,
  measurementToV1,
  movementFor,
  programToTemplate,
  songToV1,
  sportSessionToV1,
} from './migrations/v0ToV1'
import { ensurePersisted } from './persist'
import { useParisDay } from './useParisDay'

const deps: Deps = { rng: Math.random, newId: () => crypto.randomUUID() }

/** Séance antérieure à celle qu'on enregistre : l'XP (records, progression) ne se compare qu'au passé. */
const isBefore = (s: { day: string; createdAt: string }, day: string, createdAt: string) => s.day < day || (s.day === day && s.createdAt < createdAt)

/**
 * Une correction depuis l'ancienne forme garde ce qu'elle ne connaît pas : séance légère, douleur, et la
 * sortie de course elle-même (distance, durée).
 */
function keepLight(row: V1.Session, v1: V1.DataV1): V1.Session {
  const stored = v1.sessions.find((s) => s.id === row.id)
  const runs = stored?.blocks.flatMap((b) => b.entries.filter(isRunEntry)) ?? []
  return {
    ...row,
    isLight: stored?.isLight ?? false,
    ...(stored?.pain !== undefined ? { pain: stored.pain } : {}),
    ...(runs.length > 0 ? { blocks: [...row.blocks, { type: 'main' as const, entries: runs }] } : {}),
  }
}

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
        // Log d'avant le lot 4 corrigé : son XP reste celle d'origine (acquise).
        const xp = original && original.day < WEEK_XP_FROM ? { total: original.xp, lines: [] } : guitarSessionXp(d, history, [...songs, ...d.newSongs])
        const session: GuitarSession = {
          id: d.id,
          day: d.day,
          durationMin: d.durationMin,
          flowRating: d.flowRating,
          desireRating: d.desireRating,
          xp: xp.total,
          createdAt,
          items: d.items,
          ...(d.note ? { note: d.note } : {}),
        }
        const mastered = new Set(d.items.flatMap((it) => (it.kind === 'song' && it.markedMastered ? [it.songId] : [])))
        const played = new Set(d.items.flatMap((it) => (it.kind === 'song' ? [it.songId] : [])))
        const newIds = new Set(d.newSongs.map((s) => s.id))
        await write(db, now(), async () => {
          await db.sessions.put(keepLight(guitarSessionToV1(session), v1))
          for (const s of d.newSongs) await db.songs.put(songToV1(mastered.has(s.id) ? { ...s, status: 'mastered', masteredOn: d.day } : s, true))
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
        const original = data.sportSessions.find((s) => s.id === d.id)
        const createdAt = original?.createdAt ?? now()
        // Records comptés par mouvement : changer de programme ne refait pas gagner les mêmes records.
        const r = exerciseResolver(v1)
        const names = new Map(v1.exercises.map((m) => [m.id, m.name] as const))
        const history = sportByMovement(v1).filter((s) => s.id !== d.id && isBefore(s, d.day, createdAt))
        const sets = d.sets.map((x) => ({ ...x, programExerciseId: r.exerciseOf(x.programExerciseId) }))
        const xp =
          original && original.day < WEEK_XP_FROM
            ? { total: original.xp, lines: [] }
            : sportSessionXp({ sets }, history, (id) => names.get(id) ?? 'Exo inconnu')
        const session: SportSession = { ...d, xp: xp.total, createdAt }
        const row = keepLight(sportSessionToV1(session, r.exerciseOf), v1)
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
        const row = songToV1(
          s,
          played,
          v1.songs.find((x) => x.id === s.id),
        )
        await write(db, now(), async () => {
          await db.songs.put(row)
        })
      },
      async setSongStatus(id, status) {
        const song = state().v1.songs.find((s) => s.id === id)
        if (!song) return
        // Maîtrisé ou à entretenir : la date de maîtrise est gardée (ou posée aujourd'hui) ; sinon effacée.
        const masteredOn = status === 'mastered' || status === 'maintain' ? (song.masteredOn ?? todayParis()) : null
        await write(db, now(), async () => {
          await db.songs.put({ ...song, status, masteredOn })
        })
      },
      async setSongTab(id, tab) {
        const song = state().v1.songs.find((s) => s.id === id)
        if (!song) return
        const rest = { ...song }
        delete rest.tab
        await write(db, now(), async () => {
          await db.songs.put(tab.trim() ? { ...rest, tab } : rest)
        })
      },
      async saveMarathon(m) {
        const { v1 } = state()
        const before = v1.profile.marathon
        const existing = v1.templates.find((t) => t.id === RUNNER_TEMPLATE_ID)
        // Le modèle renfo est créé une fois, puis refait seulement si on passe de la salle à la maison (ou
        // l'inverse) : tes changements dans Moi › Modèles de séance restent.
        const remake = !existing || before?.constraints.gym !== m.constraints.gym
        const moves = runnerMoves(m.constraints.gym)
        const known = new Set(v1.exercises.map((x) => x.id))
        const missing = LIBRARY_MOVEMENTS.filter((x) => !known.has(x.id) && moves.some((r) => r.movementId === x.id))
        const entries: V1.TemplateEntry[] = moves.map((r, i) => ({
          id: `${RUNNER_TEMPLATE_ID}-${r.movementId}`,
          exerciseId: r.movementId,
          name: r.name,
          targetSets: r.sets,
          targetReps: r.reps,
          position: i,
          archived: false,
        }))
        // Les lignes d'avant restent (archivées) : l'historique des séances garde son mouvement.
        const old = (existing?.blocks.flatMap((b) => b.entries) ?? []).filter((e) => !entries.some((n) => n.id === e.id)).map((e) => ({ ...e, archived: true }))
        await write(db, now(), async () => {
          await db.profile.put({ ...v1.profile, marathon: m })
          if (remake) {
            await db.exercises.bulkPut(missing.map((x) => ({ ...x })))
            await db.templates.put({
              id: RUNNER_TEMPLATE_ID,
              discipline: 'sport',
              name: runnerTemplateName(m.constraints.gym),
              position: existing?.position ?? 1000,
              archived: false,
              blocks: [{ type: 'main', entries: [...entries, ...old] }],
            })
          }
        })
      },
      async saveRun(d) {
        const { v1 } = state()
        const stored = v1.sessions.find((s) => s.id === d.id)
        const before = doneRuns(v1.sessions.filter((s) => s.id !== d.id && s.day <= d.day)).map((r) => r.km)
        const xp = stored && stored.day < WEEK_XP_FROM ? { total: stored.xp, lines: [] } : runXp(d.km, before)
        const row: V1.Session = {
          id: d.id,
          discipline: 'sport',
          day: d.day,
          createdAt: stored?.createdAt ?? now(),
          durationMin: d.durationMin,
          isLight: stored?.isLight ?? false,
          flowScore: d.flowRating,
          desireScore: d.desireRating,
          ...(d.note ? { note: d.note } : {}),
          pain: d.pain,
          blocks: [{ type: 'main', entries: [{ exerciseId: RUN_MOVEMENT_ID, sets: [{ distanceKm: d.km, durationSec: d.sec }] }] }],
          xp: xp.total,
        }
        // Un chrono battu (5 km, 10 km, semi) devient la référence : les allures se recalculent.
        const m = v1.profile.marathon
        const chrono = m ? betterChrono(m.level.chrono, { km: d.km, sec: d.sec, day: d.day }) : null
        await write(db, now(), async () => {
          await db.sessions.put(row)
          if (m && chrono) await db.profile.put({ ...v1.profile, marathon: { ...m, level: { ...m.level, chrono } } })
        })
        void ensurePersisted()
        return { ...xp, chrono }
      },
      async setSickWeek(monday, sick) {
        const { v1 } = state()
        const m = v1.profile.marathon
        if (!m) return
        const sickWeeks = sick ? [...new Set([...m.sickWeeks, monday])].sort() : m.sickWeeks.filter((d) => d !== monday)
        await write(db, now(), async () => {
          await db.profile.put({ ...v1.profile, marathon: { ...m, sickWeeks } })
        })
      },
      async setOffDay(day, off) {
        const { v1 } = state()
        const m = v1.profile.marathon
        if (!m) return
        const before = m.offDays ?? []
        const offDays = off ? [...new Set([...before, day])].sort() : before.filter((d) => d !== day)
        await write(db, now(), async () => {
          await db.profile.put({ ...v1.profile, marathon: { ...m, offDays } })
        })
      },
      async saveProgram(p) {
        const { v1 } = state()
        const movements = v1.exercises.map((m) => ({ ...m }))
        const before = new Map(
          v1.templates
            .find((t) => t.id === p.id)
            ?.blocks.flatMap((b) => b.entries)
            .map((e) => [e.id, e] as const),
        )
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
      async startCycle(targets) {
        const { v1, data } = state()
        const today = todayParis()
        const cycles = v1.profile.cycles ?? []
        const number = cycles.length + 1
        const created = (['guitar', 'sport'] as const).map((d) => objective(deps.newId(), d, targets[d], number, today))
        // Les objectifs encore ouverts (défis d'avant, cycle précédent) laissent la place : remplacés, jamais effacés.
        const updates: ChallengeUpdate[] = [
          ...data.challenges.filter((c) => c.status === 'active').map((c): ChallengeUpdate => ({ type: 'replace', id: c.id })),
          ...created.map((challenge): ChallengeUpdate => ({ type: 'create', challenge })),
        ]
        const r = exerciseResolver(v1)
        const next = applyChallengeUpdates(data.challenges, updates).map((c) => challengeToV1(c, r.exerciseOf))
        const cycle: Cycle = { start: weekStart(today), guitar: created[0].id, sport: created[1].id }
        await write(db, now(), async () => {
          await db.challenges.bulkPut(next)
          await db.exercises.bulkPut(r.created())
          await db.profile.put({ ...v1.profile, cycles: [...cycles, cycle] })
        })
      },
      async saveWeeklyReview(r) {
        const { v1 } = state()
        const clean = { ...r, worked: r.worked.trim(), blocked: r.blocked.trim(), focus: r.focus.trim() }
        const reviews = [...(v1.profile.reviews ?? []).filter((x) => x.week !== r.week), clean].sort((a, b) => (a.week < b.week ? -1 : 1))
        await write(db, now(), async () => {
          await db.profile.put({ ...v1.profile, reviews })
        })
      },
      async saveCycleReview(keep) {
        const { v1 } = state()
        const cycles = v1.profile.cycles ?? []
        const last = cycles.at(-1)
        if (!last) return
        await write(db, now(), async () => {
          await db.profile.put({ ...v1.profile, cycles: [...cycles.slice(0, -1), { ...last, review: { at: todayParis(), keep: keep.trim() } }] })
        })
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
      async saveProof(p, bytes) {
        const { v1 } = state()
        await write(db, now(), async () => {
          await db.media.put({ id: p.id, bytes })
          await db.profile.put({ ...v1.profile, proofs: [...(v1.profile.proofs ?? []), p] })
        })
      },
      async deleteProof(id) {
        const { v1 } = state()
        await write(db, now(), async () => {
          await db.media.delete(id)
          await db.profile.put({ ...v1.profile, proofs: (v1.profile.proofs ?? []).filter((p) => p.id !== id) })
        })
      },
      async saveIdea(text) {
        const { v1 } = state()
        const idea: V1.Idea = { id: deps.newId(), text: text.trim(), createdAt: todayParis(), status: 'parked' }
        await write(db, now(), async () => {
          await db.profile.put({ ...v1.profile, ideas: [...(v1.profile.ideas ?? []), idea] })
        })
      },
      async setIdeaStatus(id, status) {
        const { v1 } = state()
        await write(db, now(), async () => {
          await db.profile.put({ ...v1.profile, ideas: (v1.profile.ideas ?? []).map((i) => (i.id === id ? { ...i, status } : i)) })
        })
      },
      async saveCheckin(c) {
        const { v1 } = state()
        const checkins = [...(v1.profile.checkins ?? []).filter((x) => x.day !== c.day), c].sort((a, b) => (a.day < b.day ? -1 : 1))
        await write(db, now(), async () => {
          await db.profile.put({ ...v1.profile, checkins })
        })
      },
      async importRuns(runs) {
        const { v1 } = state()
        const kms = doneRuns(v1.sessions).map((r) => ({ day: r.day, km: r.km }))
        const m = v1.profile.marathon
        let chrono = m?.level.chrono ?? null
        let changed = false
        const rows: V1.Session[] = []
        for (const r of [...runs].sort((a, b) => a.startedAt.localeCompare(b.startedAt))) {
          const xp =
            r.day < WEEK_XP_FROM
              ? { total: 0 }
              : runXp(
                  r.km,
                  kms.filter((x) => x.day <= r.day).map((x) => x.km),
                )
          kms.push({ day: r.day, km: r.km })
          const better = m ? betterChrono(chrono, { km: r.km, sec: r.sec, day: r.day }) : null
          if (better) [chrono, changed] = [better, true]
          rows.push({
            id: deps.newId(),
            discipline: 'sport',
            day: r.day,
            createdAt: r.startedAt,
            durationMin: Math.max(1, Math.round(r.sec / 60)),
            isLight: false,
            flowScore: 3,
            desireScore: 3,
            note: r.name,
            externalId: r.externalId,
            blocks: [{ type: 'main', entries: [{ exerciseId: RUN_MOVEMENT_ID, sets: [{ distanceKm: r.km, durationSec: r.sec }] }] }],
            xp: xp.total,
          })
        }
        await write(db, now(), async () => {
          await db.sessions.bulkPut(rows)
          if (m && changed && chrono) await db.profile.put({ ...v1.profile, marathon: { ...m, level: { ...m.level, chrono } } })
        })
        return rows.reduce((t, x) => t + x.xp, 0)
      },
      async saveGuitarState(g) {
        const { v1 } = state()
        await write(db, now(), async () => {
          await db.profile.put({ ...v1.profile, guitar: g })
        })
      },
      async setMorningCheckin(on) {
        const { v1 } = state()
        await write(db, now(), async () => {
          await db.profile.put({ ...v1.profile, morningCheckin: on })
        })
      },
    }
    return { actions, settle: writeChallenges }
  }, [db])

  // Objectifs : à chaque nouvelle version des données, ceux qui sont atteints passent « réussis ». Jamais avant le premier import.
  const settling = useRef(false)
  useEffect(() => {
    if (!initialized || settling.current) return
    const updates = settleChallenges(data, today, v1 ? doneRuns(v1.sessions) : [])
    if (updates.length === 0) return
    settling.current = true
    settle(updates)
      .catch(() => {})
      .finally(() => {
        settling.current = false
      })
  }, [data, v1, initialized, today, settle])

  const value = useMemo(() => ({ data, v1: v1 ?? EMPTY_DATA_V1, today }), [data, v1, today])

  if (loaded === undefined) return null
  if (!loaded.ok)
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-6 text-center">
        <h1 className="t-title">Lecture impossible</h1>
        <p className="t-body text-muted">
          Tes données sont sur ce téléphone mais n'ont pas pu être lues ({loaded.error}). Rien n'est effacé : relance l'appli.
        </p>
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
