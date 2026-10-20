/**
 * Sauvegarde : export complet en JSON, import avec aperçu (format 0 migré, format 1 tel quel), annulation.
 * L'import remplace tout en une seule transaction, après avoir gardé l'état d'avant pour pouvoir revenir.
 */
import type * as V1 from '../domain/model'
import { DATA_TABLES, DB_NAME, NEW_META, SCHEMA_VERSION, loadAll, type DeviceMeta, type MotivDb } from './db'
import { byId, LIBRARY_MOVEMENTS, migrateV0toV1, validateV0, type MigrationReport } from './migrations/v0ToV1'

export type DataTable = (typeof DATA_TABLES)[number]

export interface BackupV1 {
  app: 'motiv'
  schemaVersion: 1
  exportedAt: string
  /** D'où vient le fichier : l'appli principale (« motiv ») ou la version d'essai (« motiv-essai »). */
  source: { db: string; build: string }
  /** Nombre de lignes par table : un fichier tronqué est refusé. */
  counts: Record<DataTable, number>
  data: V1.DataV1
}

const countsOf = (d: V1.DataV1): Record<DataTable, number> => ({
  exercises: d.exercises.length,
  songs: d.songs.length,
  sessions: d.sessions.length,
  templates: d.templates.length,
  measurements: d.measurements.length,
  challenges: d.challenges.length,
  profile: 1,
})

export function makeBackup(data: V1.DataV1, exportedAt: string, build: string): BackupV1 {
  return { app: 'motiv', schemaVersion: SCHEMA_VERSION, exportedAt, source: { db: DB_NAME, build }, counts: countsOf(data), data }
}

/** « motiv-sauvegarde-2026-10-20-1832.json » (heure de Paris : deux sauvegardes du jour ne s'écrasent pas). */
export function backupFileName(exportedAt: string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(exportedAt))
      .map((x) => [x.type, x.value]),
  )
  return `${DB_NAME}-sauvegarde-${p.year}-${p.month}-${p.day}-${p.hour}${p.minute}.json`
}

/** JSON aux clés triées : deux contenus égaux donnent le même texte, quel que soit l'ordre des champs. */
export function canonical(v: unknown): string {
  return JSON.stringify(v, (_, x: unknown) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)))
      : x,
  )
}

/** Tables triées par id, comme la base les rend. */
function sorted(d: V1.DataV1): V1.DataV1 {
  return {
    exercises: [...d.exercises].sort(byId),
    songs: [...d.songs].sort(byId),
    sessions: [...d.sessions].sort(byId),
    templates: [...d.templates].sort(byId),
    measurements: [...d.measurements].sort(byId),
    challenges: [...d.challenges].sort(byId),
    profile: d.profile,
  }
}

/**
 * Remet le fichier à l'utilisateur : feuille de partage quand elle accepte les fichiers (iPhone :
 * « Enregistrer dans Fichiers »), sinon téléchargement. `cancelled` si la feuille est refermée.
 */
export async function saveFile(name: string, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([text], name, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // partage refusé : on retombe sur le téléchargement
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

/** Exporte tout et note la date de la sauvegarde (sauf si la feuille de partage est refermée). */
export async function exportAll(db: MotivDb, at: string, build: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const { data } = await loadAll(db)
  const result = await saveFile(backupFileName(at), JSON.stringify(makeBackup(data, at, build), null, 2))
  if (result !== 'cancelled')
    await db.transaction('rw', db.meta, async () => {
      await db.meta.put({ ...((await db.meta.get('device')) ?? NEW_META), lastBackupAt: at, backupSnoozedUntil: null })
    })
  return result
}

// ——— Import ———

export interface TableDiff {
  added: number
  removed: number
  changed: number
  same: number
}

export interface Prepared {
  format: 0 | 1
  exportedAt: string
  /** Le fichier vient de l'autre version (essai ↔ principale). */
  otherSource: boolean
  incoming: V1.DataV1
  report: MigrationReport | null
  warnings: string[]
  diff: Record<Exclude<DataTable, 'profile'>, TableDiff>
  /** Séances présentes sur ce téléphone et absentes du fichier : elles disparaîtraient. */
  removedSessions: V1.Session[]
  identical: boolean
  /** Mes données au moment de l'aperçu : si elles changent avant la confirmation, on refuse. */
  baseText: string
}

const fail = (error: string) => ({ ok: false as const, error })

function diffTable<T extends { id: string }>(now: T[], next: T[]): TableDiff {
  const before = new Map(now.map((x) => [x.id, canonical(x)]))
  const after = new Map(next.map((x) => [x.id, canonical(x)]))
  let changed = 0
  let same = 0
  for (const [id, text] of after) {
    if (!before.has(id)) continue
    if (before.get(id) === text) same++
    else changed++
  }
  return { added: [...after.keys()].filter((id) => !before.has(id)).length, removed: [...before.keys()].filter((id) => !after.has(id)).length, changed, same }
}

/** Les mouvements de base absents du fichier (bibliothèque enrichie depuis) y sont ajoutés, sans toucher aux miens. */
function withLibrary(d: V1.DataV1): V1.DataV1 {
  const have = new Set(d.exercises.map((m) => m.id))
  return { ...d, exercises: [...d.exercises, ...LIBRARY_MOVEMENTS.filter((m) => !have.has(m.id))].sort(byId) }
}

/** Lit, vérifie et compare un fichier, sans rien écrire. */
export function prepareImport(text: string, current: V1.DataV1): { ok: true; prepared: Prepared } | { ok: false; error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text.replace(/^﻿/, ''))
  } catch {
    return fail('Fichier illisible : il est peut-être incomplet.')
  }
  const file = raw as (Partial<Omit<BackupV1, 'schemaVersion'>> & { schemaVersion?: number }) | null
  if (!file || typeof file !== 'object' || file.app !== 'motiv') return fail("Ce fichier n'est pas une sauvegarde MOTIV.")
  if (typeof file.schemaVersion !== 'number' || file.schemaVersion > SCHEMA_VERSION)
    return fail("Ce fichier vient d'une version plus récente de MOTIV : mets l'appli à jour, puis réessaie.")

  let incoming: V1.DataV1
  let report: MigrationReport | null = null
  let warnings: string[] = []
  if (file.schemaVersion === 0) {
    const check = validateV0(raw)
    if (!check.ok) return fail(check.error)
    const m = migrateV0toV1(check.backup, check.warnings)
    incoming = m.data
    report = m.report
    warnings = check.warnings
  } else {
    const d = file.data
    if (!d || DATA_TABLES.some((t) => t !== 'profile' && !Array.isArray(d[t])) || !d.profile) return fail('Sauvegarde incomplète : une partie des données manque.')
    if (!file.counts || DATA_TABLES.some((t) => t !== 'profile' && file.counts![t] !== d[t as Exclude<DataTable, 'profile'>].length))
      return fail('Sauvegarde tronquée : le nombre de lignes ne correspond pas. Utilise un autre fichier.')
    incoming = withLibrary(sorted(d))
  }

  const removedIds = new Set(current.sessions.map((s) => s.id))
  for (const s of incoming.sessions) removedIds.delete(s.id)
  const diff = {
    exercises: diffTable(current.exercises, incoming.exercises),
    songs: diffTable(current.songs, incoming.songs),
    sessions: diffTable(current.sessions, incoming.sessions),
    templates: diffTable(current.templates, incoming.templates),
    measurements: diffTable(current.measurements, incoming.measurements),
    challenges: diffTable(current.challenges, incoming.challenges),
  }
  return {
    ok: true,
    prepared: {
      format: file.schemaVersion === 0 ? 0 : 1,
      exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : '',
      otherSource: file.schemaVersion === 1 && file.source?.db !== DB_NAME,
      incoming,
      report,
      warnings,
      diff,
      removedSessions: current.sessions.filter((s) => removedIds.has(s.id)),
      identical: canonical(sorted(current)) === canonical(incoming),
      baseText: canonical(sorted(current)),
    },
  }
}

const KEEP_SNAPSHOTS = 3

async function replaceAll(db: MotivDb, d: V1.DataV1) {
  for (const t of DATA_TABLES) await db.table(t).clear()
  await db.exercises.bulkAdd(d.exercises)
  await db.songs.bulkAdd(d.songs)
  await db.sessions.bulkAdd(d.sessions)
  await db.templates.bulkAdd(d.templates)
  await db.measurements.bulkAdd(d.measurements)
  await db.challenges.bulkAdd(d.challenges)
  await db.profile.put(d.profile)
}

async function markWritten(db: MotivDb, at: string, over: Partial<DeviceMeta> = {}) {
  const meta = (await db.meta.get('device')) ?? NEW_META
  await db.meta.put({ ...meta, initializedAt: meta.initializedAt ?? at, lastWriteAt: at, ...over })
}

/**
 * Remplace mes données par celles du fichier, tout ou rien. L'état d'avant est gardé (3 derniers) pour
 * « Annuler le dernier import ». Après coup, la base est relue : si elle ne rend pas exactement le fichier,
 * l'état d'avant est remis.
 */
export async function commitImport(db: MotivDb, p: Prepared, at: string): Promise<void> {
  await db.transaction('rw', [...DATA_TABLES, 'meta', 'snapshots'], async () => {
    const { data } = await loadAll(db)
    const nowText = canonical(data)
    if (nowText !== p.baseText) throw new Error("Tes données ont changé pendant l'aperçu : recommence l'import.")
    await db.snapshots.add({ takenAt: at, text: nowText })
    const old = await db.snapshots.orderBy('seq').reverse().offset(KEEP_SNAPSHOTS).primaryKeys()
    await db.snapshots.bulkDelete(old)
    await replaceAll(db, p.incoming)
    await markWritten(db, at)
  })
  const { data } = await loadAll(db)
  if (canonical(data) !== canonical(p.incoming)) {
    await undoLastImport(db, at)
    throw new Error("L'import ne s'est pas écrit correctement : tes données d'avant sont remises.")
  }
}

/** Remet les données d'avant le dernier import. */
export async function undoLastImport(db: MotivDb, at: string): Promise<void> {
  await db.transaction('rw', [...DATA_TABLES, 'meta', 'snapshots'], async () => {
    const last = await db.snapshots.orderBy('seq').last()
    if (!last) throw new Error("Aucun import à annuler.")
    await replaceAll(db, JSON.parse(last.text) as V1.DataV1)
    await db.snapshots.delete(last.seq!)
    await markWritten(db, at)
  })
}

/** Premier lancement sans sauvegarde : la bibliothèque de base, et c'est parti. */
export async function startEmpty(db: MotivDb, at: string): Promise<void> {
  await db.transaction('rw', [...DATA_TABLES, 'meta'], async () => {
    await db.exercises.bulkPut(LIBRARY_MOVEMENTS)
    await db.profile.put({ key: 'profile', migratedFrom: null, levelsAtMigration: null })
    await markWritten(db, at)
  })
}

const WEEK_MS = 7 * 24 * 3_600_000

/** Rappel de sauvegarde : des changements depuis la dernière, et au moins une semaine (ou jamais sauvegardé). */
export function backupDue(meta: DeviceMeta, now: Date): boolean {
  if (!meta.lastWriteAt) return false
  if (meta.backupSnoozedUntil && now.toISOString() < meta.backupSnoozedUntil) return false
  if (!meta.lastBackupAt) return true
  return meta.lastWriteAt > meta.lastBackupAt && now.getTime() - Date.parse(meta.lastBackupAt) >= WEEK_MS
}
