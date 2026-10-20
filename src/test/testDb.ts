import { afterEach } from 'vitest'
import { commitImport, prepareImport } from '../data/backup'
import { createDb, loadAll, type MotivDb } from '../data/db'
import type { BackupV0 } from '../data/migrations/v0ToV1'

let n = 0
const open: MotivDb[] = []

/** Base IndexedDB (factice) neuve pour un test, supprimée après. */
export function testDb(): MotivDb {
  const db = createDb(`test-${++n}`)
  open.push(db)
  return db
}

afterEach(async () => {
  for (const db of open.splice(0)) await db.delete()
})

/** Importe une sauvegarde format 0 comme le ferait l'écran d'import. */
export async function importV0(db: MotivDb, backup: BackupV0): Promise<void> {
  const { data } = await loadAll(db)
  const r = prepareImport(JSON.stringify(backup), data)
  if (!r.ok) throw new Error(r.error)
  await commitImport(db, r.prepared, '2026-10-20T08:00:00.000Z')
}
