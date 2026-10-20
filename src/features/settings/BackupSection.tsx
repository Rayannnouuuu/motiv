import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { useDb } from '../../data/AppDataContext'
import { exportAll, undoLastImport } from '../../data/backup'
import { ensurePersisted, isStandalone, type PersistState } from '../../data/persist'
import { Group, Row } from '../../ui/List'
import { Sheet } from '../../ui/Sheet'
import { ImportPreview } from '../backup/ImportPreview'
import { useImport } from '../backup/useImport'
import { useRun } from './useRun'

const onDay = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Europe/Paris' })

/** Export complet, import avec aperçu, annulation du dernier import, état du stockage. */
export function BackupSection() {
  const db = useDb()
  const meta = useLiveQuery(() => db.meta.get('device'), [db])
  const undoable = useLiveQuery(() => db.snapshots.count(), [db]) ?? 0
  const { busy, error, run } = useRun()
  const imp = useImport()
  const input = useRef<HTMLInputElement>(null)
  const [undoAsked, setUndoAsked] = useState(false)
  const [persist, setPersist] = useState<PersistState | null>(null)
  useEffect(() => {
    void ensurePersisted().then(setPersist)
  }, [])

  const upToDate = meta?.lastBackupAt && meta.lastWriteAt && meta.lastBackupAt >= meta.lastWriteAt
  const status = !meta?.lastBackupAt ? 'Jamais' : upToDate ? 'À jour' : `Dernière : ${onDay(meta.lastBackupAt)}`
  const storage = [
    isStandalone() ? 'Appli installée sur l’écran d’accueil' : 'Ouverte dans Safari : installe-la sur l’écran d’accueil pour protéger tes données',
    persist === 'persisted' ? 'stockage protégé' : persist === 'not-persisted' ? 'stockage non protégé par le téléphone' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <Group header="Sauvegarde" footer={error ?? imp.error ?? `Tout reste sur ce téléphone. Garde une sauvegarde dans Fichiers. ${storage}.`}>
        <Row
          title="Exporter mes données"
          detail={status}
          onClick={busy ? undefined : () => void run(async () => void (await exportAll(db, new Date().toISOString(), __BUILD_SHA__)))}
          chevron={false}
          aria-label="Exporter mes données"
        />
        <Row title="Importer une sauvegarde" onClick={() => input.current?.click()} aria-label="Importer une sauvegarde" />
        {undoable > 0 && (
          <Row
            onClick={busy ? undefined : () => (undoAsked ? void run(() => undoLastImport(db, new Date().toISOString())).then(() => setUndoAsked(false)) : setUndoAsked(true))}
            chevron={false}
            aria-label="Annuler le dernier import"
          >
            <span className="t-body text-danger">{undoAsked ? 'Confirmer : revenir aux données d’avant' : 'Annuler le dernier import'}</span>
          </Row>
        )}
      </Group>
      <input
        ref={input}
        type="file"
        aria-label="Fichier de sauvegarde"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void imp.pickFile(f)
        }}
      />
      {imp.prepared && (
        <Sheet label="Importer une sauvegarde" onClose={imp.cancel} title={() => <h2 className="t-headline text-center">Importer</h2>}>
          {(close) => <ImportPreview prepared={imp.prepared!} onConfirm={imp.confirm} onCancel={close} />}
        </Sheet>
      )}
    </>
  )
}
