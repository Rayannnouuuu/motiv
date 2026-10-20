import { useState } from 'react'
import { useDb } from '../../data/AppDataContext'
import { startEmpty } from '../../data/backup'
import { DB_NAME } from '../../data/db'
import { readLegacyLocal } from '../../data/migrations/legacyLocal'
import { isStandalone } from '../../data/persist'
import { Button } from '../../ui/Button'
import { ImportPreview } from './ImportPreview'
import { FileButton } from './FileButton'
import { useImport } from './useImport'

const LOGO = `${import.meta.env.BASE_URL}logo-512.png`

/**
 * Premier lancement : rien n'est écrit tant que je n'ai pas choisi. Reprendre les données que l'ancienne
 * version a laissées sur ce téléphone, importer une sauvegarde, ou partir de zéro.
 */
export function WelcomePage() {
  const db = useDb()
  const imp = useImport()
  const [legacy] = useState(readLegacyLocal)
  const [busy, setBusy] = useState(false)
  const essai = DB_NAME !== 'motiv'
  const sessions = legacy ? legacy.backup.data.guitarSessions.length + legacy.backup.data.sportSessions.length : 0

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="flex flex-col items-center gap-3 text-center">
        <img src={LOGO} alt="" width={96} height={96} className="rounded-[1.5rem]" />
        <h1 className="t-large">{imp.prepared ? 'Avant d’importer' : 'Bienvenue dans MOTIV'}</h1>
        {essai && <p className="t-subhead text-muted">Version d’essai : ce que tu fais ici reste ici. Tes vraies données ne bougent pas.</p>}
      </header>

      {imp.prepared ? (
        <ImportPreview prepared={imp.prepared} onConfirm={imp.confirm} onCancel={imp.cancel} />
      ) : (
        <>
          <p className="t-body text-center text-muted">Tes données vivent maintenant sur ce téléphone, sans compte ni serveur. Pour commencer :</p>
          <div className="flex flex-col gap-3">
            {legacy && (
              <Button className="w-full" onClick={() => void imp.prepare(JSON.stringify(legacy.backup))}>
                Reprendre mes données ({sessions} séance{sessions > 1 ? 's' : ''})
              </Button>
            )}
            <FileButton variant={legacy ? 'secondary' : 'primary'} onFile={(f) => void imp.pickFile(f)}>
              Importer une sauvegarde
            </FileButton>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void startEmpty(db, new Date().toISOString()).finally(() => setBusy(false))
              }}
            >
              Commencer sans données
            </Button>
          </div>
          {imp.error && (
            <p role="alert" className="t-footnote text-center text-danger">
              {imp.error}
            </p>
          )}
          {legacy && <p className="t-footnote text-center text-muted">Trouvées sur ce téléphone, laissées par l’ancienne version de MOTIV. Elles ne sont pas effacées.</p>}
          {!isStandalone() && (
            <p className="t-footnote text-center text-muted">
              Conseil : ajoute d’abord MOTIV à l’écran d’accueil (Partager › Sur l’écran d’accueil), puis importe depuis l’appli installée. Elle garde ses propres données, à l’abri du ménage de Safari.
            </p>
          )}
        </>
      )}
    </main>
  )
}
