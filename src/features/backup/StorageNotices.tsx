import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useDb } from '../../data/AppDataContext'
import { backupDue, exportAll } from '../../data/backup'
import { NEW_META } from '../../data/db'
import { isStandalone } from '../../data/persist'
import { Button } from '../../ui/Button'

const LATER_MS = 3 * 24 * 3_600_000
const onDay = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })

/**
 * En haut d'Aujourd'hui : installer l'appli (Safari peut effacer les données d'un site non installé) et
 * sauvegarder chaque semaine (rien ne quitte le téléphone tout seul). Discret, jamais bloquant.
 */
export function StorageNotices() {
  const db = useDb()
  // Calculé dans la lecture (pas au rendu) : l'heure courante n'a rien à faire dans le rendu.
  const due = useLiveQuery(async () => {
    const m = await db.meta.get('device')
    return m && backupDue(m, new Date()) ? m : null
  }, [db])
  const [busy, setBusy] = useState(false)
  const [installHidden, setInstallHidden] = useState(false)
  const install = !installHidden && !isStandalone()
  if (!due && !install) return null

  const later = () =>
    db.transaction('rw', db.meta, async () => {
      const m = (await db.meta.get('device')) ?? NEW_META
      await db.meta.put({ ...m, backupSnoozedUntil: new Date(Date.now() + LATER_MS).toISOString() })
    })

  return (
    <div className="flex flex-col gap-3">
      {install && (
        <section aria-label="Installer MOTIV" className="flex flex-col gap-2 rounded-2xl bg-surface p-4 shadow-card">
          <p className="t-subhead">
            Ajoute MOTIV à l’écran d’accueil (Partager › Sur l’écran d’accueil) : dans Safari, tes données peuvent être effacées après quelques jours sans visite.
          </p>
          <Button variant="ghost" className="self-end" onClick={() => setInstallHidden(true)}>
            Compris
          </Button>
        </section>
      )}
      {due && (
        <section aria-label="Sauvegarde" className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card">
          <p className="t-subhead">
            {due.lastBackupAt ? `Ta dernière sauvegarde date du ${onDay(due.lastBackupAt)}.` : 'Tu n’as pas encore de sauvegarde au nouveau format.'} Un tap pour la
            mettre à jour, à garder dans Fichiers.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void exportAll(db, new Date().toISOString(), __BUILD_SHA__).finally(() => setBusy(false))
              }}
            >
              Sauvegarder
            </Button>
            <Button variant="ghost" onClick={() => void later()}>
              Plus tard
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
