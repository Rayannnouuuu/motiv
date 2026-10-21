import Dexie, { type EntityTable, type Transaction } from 'dexie'
import type * as V1 from '../domain/model'

/**
 * Nom de la base selon l'adresse de l'appli : /motiv/ → « motiv », /motiv/essai/ → « motiv-essai ».
 * Les deux versions partagent la même origine : sans ça, l'essai lirait et écrirait mes vraies données.
 */
export function dbNameFor(base: string): string {
  const rest = base.replace(/^\/motiv\/?/, '').replace(/\/+$/, '')
  return rest === '' ? 'motiv' : `motiv-${rest.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
}

export const DB_NAME = dbNameFor(import.meta.env.BASE_URL)

/** Clé de stockage local propre à cette base (« motiv.liveSport.v1 » inchangée pour l'appli principale). */
export const storageKey = (key: string) => `${DB_NAME}.${key}`

/** Ce qui ne concerne que ce téléphone : jamais exporté. */
export interface DeviceMeta {
  key: 'device'
  /** Premier import ou « Commencer sans données » : avant, rien n'est écrit tout seul. */
  initializedAt: string | null
  lastWriteAt: string | null
  lastBackupAt: string | null
  backupSnoozedUntil: string | null
}

/**
 * Le fichier d'une preuve (audio, photo), même id que sa fiche dans le profil. Exporté seulement « avec médias ».
 * Les octets bruts plutôt qu'un Blob : Safari garde mal les Blob dans IndexedDB.
 */
export interface MediaRow {
  id: string
  bytes: ArrayBuffer
}

/** Mes données telles qu'avant un import, pour pouvoir l'annuler. */
export interface SnapshotRow {
  seq?: number
  takenAt: string
  text: string
}

export type MotivDb = Dexie & {
  meta: EntityTable<DeviceMeta, 'key'>
  profile: EntityTable<V1.Profile, 'key'>
  exercises: EntityTable<V1.Movement, 'id'>
  songs: EntityTable<V1.Song, 'id'>
  sessions: EntityTable<V1.Session, 'id'>
  templates: EntityTable<V1.Template, 'id'>
  measurements: EntityTable<V1.Measurement, 'id'>
  challenges: EntityTable<V1.Challenge, 'id'>
  snapshots: EntityTable<SnapshotRow, 'seq'>
  media: EntityTable<MediaRow, 'id'>
}

/** Format des données (sauvegarde et migration). Une version publiée ne se modifie jamais : on en ajoute une. */
export const SCHEMA_VERSION = 1

/**
 * Version de la base sur l'appareil. 2 (lot 5) : ajoute la table `media` (fichiers audio et photo), sans toucher
 * aux autres tables ; le format des données reste 1.
 */
export const DB_VERSION = 2

/**
 * Tables de mes données : toutes exportées. Les autres restent sur l'appareil (meta, snapshots), sauf `media`,
 * exportée seulement « avec photos et audio ».
 */
export const DATA_TABLES = ['exercises', 'songs', 'sessions', 'templates', 'measurements', 'challenges', 'profile'] as const
export const DEVICE_TABLES = ['meta', 'snapshots', 'media'] as const

export function createDb(name: string = DB_NAME): MotivDb {
  const db = new Dexie(name) as MotivDb
  db.version(1).stores({
    meta: 'key',
    profile: 'key',
    exercises: 'id',
    songs: 'id',
    sessions: 'id, day',
    templates: 'id',
    measurements: 'id, day',
    challenges: 'id',
    snapshots: '++seq',
  })
  db.version(DB_VERSION).stores({ media: 'id' })
  return db
}

export const NEW_META: DeviceMeta = { key: 'device', initializedAt: null, lastWriteAt: null, lastBackupAt: null, backupSnoozedUntil: null }

/** Toutes mes données d'un coup, dans une seule lecture cohérente (triées par id, l'ordre des clés). */
export async function loadAll(db: MotivDb): Promise<{ data: V1.DataV1; meta: DeviceMeta }> {
  return db.transaction('r', [...DATA_TABLES, ...DEVICE_TABLES.filter((t) => t === 'meta')], async () => {
    const [exercises, songs, sessions, templates, measurements, challenges, profile, meta] = await Promise.all([
      db.exercises.toArray(),
      db.songs.toArray(),
      db.sessions.toArray(),
      db.templates.toArray(),
      db.measurements.toArray(),
      db.challenges.toArray(),
      db.profile.get('profile'),
      db.meta.get('device'),
    ])
    return {
      data: {
        exercises,
        songs,
        sessions,
        templates,
        measurements,
        challenges,
        profile: profile ?? { key: 'profile', migratedFrom: null, levelsAtMigration: null },
      },
      meta: meta ?? NEW_META,
    }
  })
}

/**
 * Une intention = une transaction : tout est écrit, ou rien. Note l'heure de la dernière écriture
 * (rappel de sauvegarde). N'attendre que des opérations Dexie dans `fn`, sinon la transaction se ferme.
 */
export async function write(db: MotivDb, at: string, fn: (tx: Transaction) => Promise<void>): Promise<void> {
  await db.transaction('rw', [...DATA_TABLES, 'meta', 'media'], async (tx) => {
    await fn(tx)
    const meta = (await db.meta.get('device')) ?? NEW_META
    await db.meta.put({ ...meta, lastWriteAt: at })
  })
}
