import { useState } from 'react'
import { backupFileName, makeBackup, saveFile } from '../../data/backup'
import { useAppData } from '../../data/AppDataContext'
import { Group, Row } from '../../ui/List'
import { useRun } from './useRun'

/** Export complet de mes données en JSON, à garder dans Fichiers. */
export function BackupSection() {
  const { data, fresh, today } = useAppData()
  const { busy, error, run } = useRun()
  const [done, setDone] = useState(false)
  const sessions = data.guitarSessions.length + data.sportSessions.length

  const exportAll = () =>
    run(async () => {
      setDone(false)
      const text = JSON.stringify(makeBackup(data, new Date().toISOString()), null, 2)
      if ((await saveFile(backupFileName(today), text)) !== 'cancelled') setDone(true)
    })

  return (
    <Group
      header="Sauvegarde"
      footer={
        error ??
        (fresh
          ? 'Un fichier avec toutes tes séances, morceaux, programmes, mesures et défis. Garde-le dans Fichiers.'
          : 'Il faut le réseau : la sauvegarde part des données à jour du serveur.')
      }
    >
      <Row
        title={done ? 'Sauvegarde prête ✓' : 'Exporter mes données'}
        detail={`${sessions} séance${sessions > 1 ? 's' : ''}`}
        onClick={busy || !fresh ? undefined : () => void exportAll()}
        chevron={false}
        aria-label="Exporter mes données"
      />
    </Group>
  )
}
