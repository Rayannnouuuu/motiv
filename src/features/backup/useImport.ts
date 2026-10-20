import { useState } from 'react'
import { useDb } from '../../data/AppDataContext'
import { commitImport, prepareImport, type Prepared } from '../../data/backup'
import { loadAll } from '../../data/db'
import { ensurePersisted } from '../../data/persist'

/** Import d'une sauvegarde : lecture et aperçu d'abord, écriture seulement à la confirmation. */
export function useImport(onDone?: () => void) {
  const db = useDb()
  const [prepared, setPrepared] = useState<Prepared | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function prepare(text: string) {
    setError(null)
    const { data } = await loadAll(db)
    const r = prepareImport(text, data)
    if (r.ok) setPrepared(r.prepared)
    else setError(r.error)
  }

  return {
    prepared,
    error,
    prepare,
    pickFile: (file: File) => file.text().then(prepare, () => setError('Fichier illisible : il est peut-être incomplet.')),
    cancel: () => setPrepared(null),
    async confirm() {
      if (!prepared) return
      await commitImport(db, prepared, new Date().toISOString())
      setPrepared(null)
      void ensurePersisted()
      onDone?.()
    },
  }
}
