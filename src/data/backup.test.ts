import { afterEach, describe, expect, test, vi } from 'vitest'
import { v0Replica } from '../test/fixtures/v0Replica'
import { importV0, testDb } from '../test/testDb'
import { backupDue, backupFileName, canonical, commitImport, exportAll, makeBackup, prepareImport, startEmpty, undoLastImport } from './backup'
import { DATA_TABLES, DEVICE_TABLES, NEW_META, dbNameFor, loadAll } from './db'
import { toAppData } from './migrations/project'

const AT = '2026-10-20T09:00:00.000Z'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('base locale', () => {
  test('nom de base selon l’adresse : l’essai a ses propres données', () => {
    expect(dbNameFor('/motiv/')).toBe('motiv')
    expect(dbNameFor('/motiv/essai/')).toBe('motiv-essai')
  })

  test('chaque table est exportée ou déclarée « appareil seulement »', () => {
    const db = testDb()
    expect(db.tables.map((t) => t.name).sort()).toEqual([...DATA_TABLES, ...DEVICE_TABLES].sort())
  })
})

describe('import', () => {
  test('format 0 → base : aperçu sans écriture, puis tout est écrit d’un coup', async () => {
    const db = testDb()
    const empty = (await loadAll(db)).data
    const r = prepareImport(JSON.stringify(v0Replica()), empty)
    if (!r.ok) throw new Error(r.error)
    expect(await db.sessions.count()).toBe(0)
    expect(r.prepared).toMatchObject({ format: 0, identical: false, removedSessions: [] })
    expect(r.prepared.diff.sessions).toEqual({ added: 7, removed: 0, changed: 0, same: 0 })
    expect(r.prepared.warnings).toHaveLength(1)
    await commitImport(db, r.prepared, AT)
    const { data, meta } = await loadAll(db)
    expect(toAppData(data).guitarSessions).toHaveLength(6)
    expect(meta.initializedAt).toBe(AT)
    expect(await db.snapshots.count()).toBe(1)
  })

  test('aller-retour : export → import dans une base neuve → données identiques', async () => {
    const a = testDb()
    await importV0(a, v0Replica())
    const file = JSON.stringify(makeBackup((await loadAll(a)).data, AT, 'test'))
    const b = testDb()
    const r = prepareImport(file, (await loadAll(b)).data)
    if (!r.ok) throw new Error(r.error)
    await commitImport(b, r.prepared, AT)
    expect(canonical((await loadAll(b)).data)).toBe(canonical((await loadAll(a)).data))
    // Réimporter le même fichier : rien ne change.
    const again = prepareImport(file, (await loadAll(b)).data)
    expect(again.ok && again.prepared.identical).toBe(true)
  })

  test('les séances qui disparaîtraient sont listées', async () => {
    const db = testDb()
    await importV0(db, v0Replica())
    const older = v0Replica()
    older.data.guitarSessions = older.data.guitarSessions.slice(0, 4)
    const r = prepareImport(JSON.stringify(older), (await loadAll(db)).data)
    expect(r.ok && r.prepared.removedSessions.map((s) => s.id)).toEqual(['g-5', 'g-6'])
  })

  test('annuler le dernier import rend exactement les données d’avant', async () => {
    const db = testDb()
    await startEmpty(db, AT)
    const before = canonical((await loadAll(db)).data)
    await importV0(db, v0Replica())
    await undoLastImport(db, AT)
    expect(canonical((await loadAll(db)).data)).toBe(before)
    expect(await db.snapshots.count()).toBe(0)
  })

  test('données modifiées pendant l’aperçu : refus, rien n’est écrit', async () => {
    const db = testDb()
    const r = prepareImport(JSON.stringify(v0Replica()), (await loadAll(db)).data)
    if (!r.ok) throw new Error(r.error)
    await startEmpty(db, AT)
    await expect(commitImport(db, r.prepared, AT)).rejects.toThrow('Tes données ont changé')
    expect(await db.sessions.count()).toBe(0)
  })

  test('écriture interrompue au milieu : la base reste comme avant', async () => {
    const db = testDb()
    await startEmpty(db, AT)
    const before = canonical((await loadAll(db)).data)
    const r = prepareImport(JSON.stringify(v0Replica()), (await loadAll(db)).data)
    if (!r.ok) throw new Error(r.error)
    vi.spyOn(db.challenges, 'bulkAdd').mockRejectedValueOnce(new Error('quota'))
    await expect(commitImport(db, r.prepared, AT)).rejects.toThrow('quota')
    expect(canonical((await loadAll(db)).data)).toBe(before)
    expect(await db.snapshots.count()).toBe(0)
  })

  test.each([
    ['pas du JSON', '{"app":"motiv",', 'Fichier illisible : il est peut-être incomplet.'],
    ['autre appli', '{"app":"autre"}', "Ce fichier n'est pas une sauvegarde MOTIV."],
    ['version future', '{"app":"motiv","schemaVersion":9}', "Ce fichier vient d'une version plus récente de MOTIV : mets l'appli à jour, puis réessaie."],
  ])('refuse : %s', (_, text, error) => {
    expect(
      prepareImport(text, {
        exercises: [],
        songs: [],
        sessions: [],
        templates: [],
        measurements: [],
        challenges: [],
        profile: { key: 'profile', migratedFrom: null, levelsAtMigration: null },
      }),
    ).toEqual({ ok: false, error })
  })

  test('fichier format 1 tronqué : refusé', async () => {
    const db = testDb()
    await importV0(db, v0Replica())
    const backup = makeBackup((await loadAll(db)).data, AT, 'test')
    backup.data.sessions.pop()
    expect(prepareImport(JSON.stringify(backup), (await loadAll(db)).data)).toEqual({
      ok: false,
      error: 'Sauvegarde tronquée : le nombre de lignes ne correspond pas. Utilise un autre fichier.',
    })
  })
})

describe('export', () => {
  test('fichier daté à l’heure de Paris, et date de sauvegarde notée', async () => {
    expect(backupFileName('2026-10-20T16:32:00.000Z')).toBe('motiv-sauvegarde-2026-10-20-1832.json')
    const db = testDb()
    await importV0(db, v0Replica())
    let blob: Blob | undefined
    vi.stubGlobal('URL', { ...URL, createObjectURL: (b: Blob) => ((blob = b), 'blob:x'), revokeObjectURL: () => {} })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    expect(await exportAll(db, AT, 'abc1234')).toBe('downloaded')
    const file = JSON.parse(await blob!.text())
    expect(file).toMatchObject({ app: 'motiv', schemaVersion: 1, source: { db: 'motiv', build: 'abc1234' }, counts: { sessions: 7, songs: 45 } })
    expect((await loadAll(db)).meta.lastBackupAt).toBe(AT)
  })

  test('feuille de partage refermée : pas de date de sauvegarde', async () => {
    const db = testDb()
    await startEmpty(db, AT)
    vi.stubGlobal('navigator', { ...navigator, canShare: () => true, share: vi.fn(async () => Promise.reject(new DOMException('x', 'AbortError'))) })
    expect(await exportAll(db, AT, 'x')).toBe('cancelled')
    expect((await loadAll(db)).meta.lastBackupAt).toBeNull()
  })
})

describe('rappel de sauvegarde', () => {
  const now = new Date('2026-10-20T12:00:00Z')
  test.each([
    ['rien écrit', { lastWriteAt: null }, false],
    ['jamais sauvegardé', { lastWriteAt: '2026-10-19T10:00:00Z' }, true],
    ['sauvegardé il y a 3 jours', { lastWriteAt: '2026-10-19T10:00:00Z', lastBackupAt: '2026-10-17T10:00:00Z' }, false],
    ['sauvegardé il y a 8 jours, changé depuis', { lastWriteAt: '2026-10-19T10:00:00Z', lastBackupAt: '2026-10-12T10:00:00Z' }, true],
    ['sauvegardé il y a 8 jours, rien changé', { lastWriteAt: '2026-10-11T10:00:00Z', lastBackupAt: '2026-10-12T10:00:00Z' }, false],
    ['mis en pause', { lastWriteAt: '2026-10-19T10:00:00Z', backupSnoozedUntil: '2026-10-21T12:00:00Z' }, false],
  ])('%s', (_, over, due) => {
    expect(backupDue({ ...NEW_META, ...over }, now)).toBe(due)
  })
})
