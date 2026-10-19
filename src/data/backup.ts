import type { AppData, Day } from '../domain/types'

/** Version du format de sauvegarde. 0 = données de la version Supabase (séances guitare et sport séparées). */
export const BACKUP_VERSION = 0

export interface Backup {
  app: 'motiv'
  schemaVersion: number
  exportedAt: string
  data: AppData
}

export function makeBackup(data: AppData, exportedAt: string): Backup {
  return { app: 'motiv', schemaVersion: BACKUP_VERSION, exportedAt, data }
}

export const backupFileName = (day: Day) => `motiv-sauvegarde-${day}.json`

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
