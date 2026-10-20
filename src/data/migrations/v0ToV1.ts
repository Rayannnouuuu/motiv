/**
 * Format 0 (version Supabase : séances guitare et sport séparées) → modèle v1.
 * Fonctions pures et déterministes : ni date, ni hasard. Elles servent à l'import d'une sauvegarde et,
 * au lot 1, à chaque écriture (les écrans produisent encore l'ancienne forme).
 */
import { catalogSong } from '../../content/songCatalog'
import { movementKey, SPORT_MOVEMENTS } from '../../content/sportLibrary'
import { allLevels } from '../../domain/levels'
import type * as V1 from '../../domain/model'
import type { AppData, BodyMetric, Challenge, GuitarItem, GuitarSession, Program, Song, SportSession } from '../../domain/types'

/** Sauvegarde de la version Supabase (src/data/backup.ts d'avant le lot 1). */
export interface BackupV0 {
  app: 'motiv'
  schemaVersion: 0
  exportedAt: string
  data: AppData
}

/** Les mouvements de base, tels que la base les stocke (modifiables). */
export const LIBRARY_MOVEMENTS: V1.Movement[] = SPORT_MOVEMENTS.map(({ id, name, category, body, metric, repRange, equipment, aliases }) => ({
  id,
  discipline: 'sport',
  name,
  category,
  body,
  metric,
  repRange,
  equipment,
  aliases,
  source: 'legacy',
  archived: false,
}))

/** Comparaison par code : identique partout (localeCompare dépend du moteur). */
export const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/** Découpe une liste en suites consécutives de même clé, dans l'ordre. */
function runs<T>(list: T[], key: (x: T) => string): T[][] {
  const out: T[][] = []
  for (const x of list) {
    const last = out.at(-1)
    if (last && key(last[0]) === key(x)) last.push(x)
    else out.push([x])
  }
  return out
}

// ——— Mouvements ———

/** Retrouve un mouvement par nom ou alias (même clé que la bibliothèque), parmi ceux déjà en base. */
export function findStoredMovement(name: string, movements: V1.Movement[]): V1.Movement | undefined {
  const key = movementKey(name)
  return movements.find((m) => [m.name, ...m.aliases].some((n) => movementKey(n) === key))
}

/**
 * Mouvement pour un nom tapé librement : celui de la base s'il est reconnu, sinon un mouvement à moi créé
 * (ajouté à `movements`). Jamais de rapprochement approximatif : deux charges non comparables ne se mélangent pas.
 */
export function movementFor(name: string, movements: V1.Movement[]): V1.Movement {
  const found = findStoredMovement(name, movements)
  if (found) return found
  const base = `user-${movementKey(name).replace(/ /g, '-') || 'exo'}`
  let id = base
  for (let n = 2; movements.some((m) => m.id === id); n++) id = `${base}-${n}`
  const created: V1.Movement = {
    id,
    discipline: 'sport',
    name: name.trim(),
    category: null,
    body: null,
    metric: 'load_reps',
    repRange: null,
    equipment: null,
    aliases: [],
    source: 'user',
    archived: false,
  }
  movements.push(created)
  return created
}

// ——— Entités ———

function guitarBlocks(items: GuitarItem[]): V1.Block[] {
  return runs(items, (it) => it.kind).map((group) => ({
    type: group[0].kind === 'exercise' ? 'technique' : 'repertoire',
    entries: group.map((it): V1.Entry =>
      it.kind === 'exercise'
        ? { exerciseId: it.exerciseId, sets: it.maxBpm === null ? [] : [it.clean ? { bpm: it.maxBpm, clean: true } : { bpm: it.maxBpm }] }
        : it.markedMastered
          ? { songId: it.songId, markedMastered: true, sets: [] }
          : { songId: it.songId, sets: [] },
    ),
  }))
}

export function guitarSessionToV1(s: GuitarSession): V1.Session {
  return {
    id: s.id,
    discipline: 'guitar',
    day: s.day,
    createdAt: s.createdAt,
    durationMin: s.durationMin,
    isLight: false,
    flowScore: s.flowRating,
    desireScore: s.desireRating,
    blocks: guitarBlocks(s.items),
    xp: s.xp,
    ...(s.note ? { note: s.note } : {}),
  }
}

/** `exerciseOf` : mouvement d'un ancien id d'exo de programme. */
export function sportSessionToV1(s: SportSession, exerciseOf: (programExerciseId: string) => string): V1.Session {
  const entries = runs(s.sets, (x) => x.programExerciseId).map((group): V1.Entry => ({
    exerciseId: exerciseOf(group[0].programExerciseId),
    templateEntryId: group[0].programExerciseId,
    sets: group.map((x) => ({ reps: x.reps, loadKg: x.weightKg })),
  }))
  return {
    id: s.id,
    discipline: 'sport',
    day: s.day,
    createdAt: s.createdAt,
    durationMin: s.durationMin,
    isLight: false,
    flowScore: s.flowRating,
    desireScore: s.desireRating,
    templateId: s.programId,
    blocks: entries.length > 0 ? [{ type: 'main', entries }] : [],
    xp: s.xp,
    ...(s.note ? { note: s.note } : {}),
  }
}

export function programToTemplate(p: Program, exerciseOf: (programExerciseId: string) => string): V1.Template {
  return {
    id: p.id,
    discipline: 'sport',
    name: p.name,
    position: p.position,
    archived: p.archived,
    blocks: [
      {
        type: 'main',
        entries: p.exercises.map((e) => ({
          id: e.id,
          exerciseId: exerciseOf(e.id),
          name: e.name,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
          position: e.position,
          archived: e.archived,
        })),
      },
    ],
  }
}

/** « En cours » seulement une fois joué (règle de l'appli depuis le 15 oct.) ; sinon « à apprendre ». */
export function songToV1(s: Song, played: boolean, previous?: V1.Song): V1.Song {
  // L'ancienne forme ne connaît que « en cours » et « maîtrisé » : un statut plus fin déjà en base est gardé.
  const coarse = (x: V1.SongStatus) => (x === 'mastered' || x === 'maintain' ? 'mastered' : 'learning')
  const fresh: V1.SongStatus = s.status === 'mastered' ? 'mastered' : played ? 'learning' : 'to_learn'
  const keep = previous && coarse(previous.status) === s.status && !(previous.status === 'to_learn' && played)
  const status = keep ? previous.status : fresh
  const out: V1.Song = {
    id: s.id,
    title: s.title,
    artist: previous?.artist ?? catalogSong(s.title)?.artist ?? '',
    status,
    masteredOn: s.masteredOn,
  }
  if (previous?.notes !== undefined) out.notes = previous.notes
  if (previous?.targetBpm !== undefined) out.targetBpm = previous.targetBpm
  return out
}

export function challengeToV1(c: Challenge, exerciseOf: (programExerciseId: string) => string): V1.Challenge {
  const t = c.target
  const target: V1.ChallengeTarget =
    t.kind === 'weight' || t.kind === 'reps'
      ? (() => {
          const { programExerciseId, ...rest } = t
          return { ...rest, exerciseId: exerciseOf(programExerciseId), templateEntryId: programExerciseId }
        })()
      : t
  return { ...c, target }
}

export const measurementToV1 = (m: BodyMetric): V1.Measurement => ({ ...m })

// ——— Validation et migration complète ———

export type V0Check = { ok: true; backup: BackupV0; warnings: string[] } | { ok: false; error: string }

const DAY = /^\d{4}-\d{2}-\d{2}$/
const ARRAYS = ['guitarSessions', 'songs', 'sportSessions', 'programs', 'bodyMetrics', 'challenges'] as const

/** Forme du fichier et valeurs invraisemblables (signalées, jamais corrigées). */
export function validateV0(raw: unknown): V0Check {
  const f = raw as Partial<BackupV0> | null
  if (!f || typeof f !== 'object' || f.app !== 'motiv') return { ok: false, error: "Ce fichier n'est pas une sauvegarde MOTIV." }
  if (f.schemaVersion !== 0) return { ok: false, error: 'Version de sauvegarde inattendue.' }
  const d = f.data as Record<string, unknown> | undefined
  if (!d || ARRAYS.some((k) => !Array.isArray(d[k]))) return { ok: false, error: 'Sauvegarde incomplète : une partie des données manque.' }
  const data = f.data as AppData
  const sessions = [...data.guitarSessions, ...data.sportSessions]
  if (sessions.some((s) => typeof s.id !== 'string' || !DAY.test(s.day) || !(s.durationMin > 0)))
    return { ok: false, error: 'Une séance du fichier est illisible.' }
  if (new Set(sessions.map((s) => s.id)).size !== sessions.length) return { ok: false, error: 'Deux séances ont le même identifiant.' }
  const warnings: string[] = []
  for (const m of data.bodyMetrics) {
    if (m.waistCm !== null && (m.waistCm < 40 || m.waistCm > 160))
      warnings.push(`Mesure du ${m.day} : ${m.waistCm} cm en tour de taille, ce serait plutôt ta hauteur ? La valeur est gardée telle quelle.`)
    if (m.weightKg !== null && (m.weightKg < 30 || m.weightKg > 250)) warnings.push(`Mesure du ${m.day} : poids de ${m.weightKg} kg à vérifier.`)
  }
  return { ok: true, backup: f as BackupV0, warnings }
}

export interface MigrationReport {
  /** Mouvement retenu pour chaque nom d'exo de programme (dédoublonné). */
  movements: { name: string; exerciseId: string; exerciseName: string; own: boolean }[]
  /** Mouvements qui réunissent plusieurs noms différents (leurs historiques sont mis en commun). */
  merges: { exerciseName: string; names: string[] }[]
  songs: { toLearn: number; learning: number; mastered: number; withArtist: number }
  warnings: string[]
}

export function migrateV0toV1(backup: BackupV0, warnings: string[] = []): { data: V1.DataV1; report: MigrationReport } {
  const v0 = backup.data
  const movements = LIBRARY_MOVEMENTS.map((m) => ({ ...m }))
  // Les exos des programmes, triés par id : même entrée, mêmes mouvements créés et même rapport.
  const programExercises = v0.programs.flatMap((p) => p.exercises).sort(byId)
  const byPe = new Map<string, string>()
  for (const pe of programExercises) byPe.set(pe.id, movementFor(pe.name, movements).id)
  const exerciseOf = (peId: string) => {
    const known = byPe.get(peId)
    if (known) return known
    // Série dont l'exo de programme a disparu : gardée, sous un mouvement « inconnu » à part.
    const id = movementFor(`Exo inconnu ${peId.slice(0, 8)}`, movements).id
    byPe.set(peId, id)
    return id
  }

  const sessions = [...v0.guitarSessions.map(guitarSessionToV1), ...v0.sportSessions.map((s) => sportSessionToV1(s, exerciseOf))].sort(byId)
  const playedSongs = new Set(v0.guitarSessions.flatMap((s) => s.items.flatMap((it) => (it.kind === 'song' ? [it.songId] : []))))
  const songs = v0.songs.map((s) => songToV1(s, playedSongs.has(s.id))).sort(byId)
  const templates = v0.programs.map((p) => programToTemplate(p, exerciseOf)).sort(byId)
  const challenges = v0.challenges.map((c) => challengeToV1(c, exerciseOf)).sort(byId)
  const levels = allLevels(v0)

  const data: V1.DataV1 = {
    exercises: movements.sort(byId),
    songs,
    sessions,
    templates,
    measurements: v0.bodyMetrics.map(measurementToV1).sort(byId),
    challenges,
    profile: {
      key: 'profile',
      migratedFrom: { format: 0, exportedAt: backup.exportedAt },
      levelsAtMigration: { guitar: levels.guitar.level, sport: levels.sport.level, global: levels.global.level },
    },
  }

  const nameOf = new Map(data.exercises.map((m) => [m.id, m] as const))
  const seen = new Map<string, MigrationReport['movements'][number]>()
  for (const pe of programExercises) {
    const exerciseId = byPe.get(pe.id)!
    const key = `${pe.name}\u0000${exerciseId}`
    if (!seen.has(key)) seen.set(key, { name: pe.name, exerciseId, exerciseName: nameOf.get(exerciseId)!.name, own: nameOf.get(exerciseId)!.source === 'user' })
  }
  const rows = [...seen.values()]
  const namesByExercise = new Map<string, Set<string>>()
  for (const r of rows) namesByExercise.set(r.exerciseId, (namesByExercise.get(r.exerciseId) ?? new Set()).add(r.name))
  const merges = [...namesByExercise]
    .filter(([, names]) => names.size > 1)
    .map(([id, names]) => ({ exerciseName: nameOf.get(id)!.name, names: [...names].sort() }))
    .sort((a, b) => (a.exerciseName < b.exerciseName ? -1 : 1))

  return {
    data,
    report: {
      movements: rows,
      merges,
      songs: {
        toLearn: songs.filter((s) => s.status === 'to_learn').length,
        learning: songs.filter((s) => s.status === 'learning').length,
        mastered: songs.filter((s) => s.status === 'mastered').length,
        withArtist: songs.filter((s) => s.artist !== '').length,
      },
      warnings,
    },
  }
}
