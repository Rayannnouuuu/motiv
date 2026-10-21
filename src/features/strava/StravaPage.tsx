import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActions, useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { shortDate } from '../../domain/date'
import { formatPace } from '../../domain/marathon/paces'
import { runOf } from '../../domain/marathon/runs'
import { parseGpx, parseStravaCsv, splitNew, type ImportedRun } from '../../domain/stravaImport'
import { Button } from '../../ui/Button'
import { ModalBar } from '../../ui/ModalBar'
import { useRun } from '../settings/useRun'

const km = (v: number) => `${v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} km`
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`
const SHOWN = 10

interface Preview {
  fresh: ImportedRun[]
  known: number
  others: number
}

/** Lit les fichiers choisis : un activities.csv, ou un ou plusieurs .gpx. */
async function readFiles(files: File[]): Promise<{ runs: ImportedRun[]; others: number } | null> {
  const runs: ImportedRun[] = []
  let others = 0
  for (const f of files) {
    const text = await f.text()
    if (/\.gpx$/i.test(f.name) || text.trimStart().startsWith('<')) {
      const r = parseGpx(text)
      if (r) runs.push(r)
      else others++
    } else {
      const r = parseStravaCsv(text)
      if (!r) return null
      runs.push(...r.runs)
      others += r.others
    }
  }
  return { runs, others }
}

/** Courses Strava (lot 6) : importer ses sorties d'un fichier d'export, sans rien envoyer à Strava. */
export function StravaPage() {
  const { v1 } = useAppData()
  const { importRuns } = useActions()
  const navigate = useNavigate()
  const { busy, error, run } = useRun()
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [done, setDone] = useState<{ n: number; xp: number } | null>(null)

  async function pick(files: File[]) {
    setProblem(null)
    setDone(null)
    const read = await readFiles(files).catch(() => null)
    if (!read || (read.runs.length === 0 && read.others === 0)) {
      setPreview(null)
      setProblem("Ce fichier n'est pas un export Strava : choisis activities.csv (dans l'archive) ou un .gpx.")
      return
    }
    setPreview({ ...splitNew(read.runs, v1.sessions, runOf), others: read.others })
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <ModalBar onCancel={() => navigate(-1)} cancelLabel="Fermer" title="Courses Strava" />
      <div>
        <p className="t-overline text-sport">Import par fichier</p>
        <h1 className="t-title1 mt-1">Tes sorties Strava dans MOTIV</h1>
        <p className="t-subhead mt-2 text-muted">Rien n'est envoyé à Strava : tu choisis un fichier, MOTIV le lit sur ce téléphone.</p>
      </div>

      <ol className="t-subhead flex flex-col gap-3 rounded-xl border border-line bg-surface px-4 py-3.5">
        <li>
          <span className="font-semibold">Toutes tes sorties</span> : sur strava.com, Paramètres › Mon compte › Télécharger ou supprimer votre compte › Demander
          une archive. Ouvre le .zip reçu par mail dans Fichiers, puis choisis <span className="font-semibold">activities.csv</span>.
        </li>
        <li>
          <span className="font-semibold">Une sortie</span> : sur strava.com, ouvre l'activité, menu « … » › Exporter GPX.
        </li>
      </ol>

      <Button tone="sport" variant={preview ? 'secondary' : 'primary'} disabled={busy} onClick={() => input.current?.click()}>
        <Icon name="import" />
        Choisir un fichier
      </Button>
      <input
        ref={input}
        type="file"
        multiple
        accept=".csv,.gpx,text/csv,application/gpx+xml"
        aria-label="Fichier Strava"
        className="hidden"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = ''
          if (files.length > 0) void pick(files)
        }}
      />

      {(problem ?? error) && (
        <p role="alert" className="t-subhead text-danger">
          {problem ?? error}
        </p>
      )}

      {done && (
        <p role="status" className="t-callout rounded-xl bg-inset px-4 py-3 font-semibold">
          {plural(done.n, 'sortie ajoutée', 'sorties ajoutées')}
          {done.xp > 0 ? ` · +${done.xp} XP` : ''}. Elles comptent dans ta semaine et ton plan.
        </p>
      )}

      {preview && (
        <section className="flex flex-col gap-3" aria-label="Aperçu">
          <p className="t-subhead text-muted">
            {plural(preview.fresh.length, 'course à ajouter', 'courses à ajouter')}
            {preview.known > 0 ? ` · ${preview.known} déjà là` : ''}
            {preview.others > 0 ? ` · ${plural(preview.others, 'autre activité ignorée', 'autres activités ignorées')}` : ''}
          </p>
          {preview.fresh.length > 0 && (
            <ul className="rows overflow-hidden rounded-xl border border-line bg-surface">
              {[...preview.fresh]
                .reverse()
                .slice(0, SHOWN)
                .map((r) => (
                  <li key={r.externalId} className="flex items-center gap-3 px-4 py-2.5">
                    <Icon name="sport" className="text-sport" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="t-body truncate">{r.name}</span>
                      <span className="t-footnote text-muted tabular-nums">
                        {shortDate(r.day)} · {km(r.km)} · {formatPace(r.sec / r.km)} /km
                      </span>
                    </span>
                  </li>
                ))}
              {preview.fresh.length > SHOWN && <li className="t-footnote px-4 py-2 text-muted">et {preview.fresh.length - SHOWN} de plus</li>}
            </ul>
          )}
          {preview.fresh.length > 0 ? (
            <Button
              tone="sport"
              disabled={busy}
              onClick={() => {
                let xp = 0
                void run(async () => {
                  xp = await importRuns(preview.fresh)
                }).then((ok) => {
                  if (!ok) return
                  setDone({ n: preview.fresh.length, xp })
                  setPreview(null)
                })
              }}
            >
              Ajouter {plural(preview.fresh.length, 'course', 'courses')}
            </Button>
          ) : (
            <p className="t-subhead">Rien de nouveau : toutes les courses de ce fichier sont déjà là.</p>
          )}
        </section>
      )}
    </div>
  )
}
