import { useState } from 'react'
import type { Prepared, TableDiff } from '../../data/backup'
import { shortDate } from '../../domain/date'
import { Button } from '../../ui/Button'
import { Group, Row } from '../../ui/List'

const TABLES: { key: keyof Prepared['diff']; label: string }[] = [
  { key: 'sessions', label: 'Séances' },
  { key: 'songs', label: 'Morceaux' },
  { key: 'templates', label: 'Modèles de séance' },
  { key: 'measurements', label: 'Mesures' },
  { key: 'exercises', label: 'Mouvements' },
  { key: 'challenges', label: 'Défis' },
]

const before = (d: TableDiff) => d.same + d.changed + d.removed
const after = (d: TableDiff) => d.same + d.changed + d.added
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`
const exportedOn = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }) : 'date inconnue'

/**
 * Aperçu avant d'écraser quoi que ce soit : ce téléphone face au fichier, ce que la migration a fait,
 * et surtout ce qui disparaîtrait. Deux confirmations s'il y a des séances à perdre.
 */
export function ImportPreview({ prepared: p, onConfirm, onCancel }: { prepared: Prepared; onConfirm: () => Promise<void>; onCancel: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sure, setSure] = useState(false)
  const losing = p.removedSessions.length
  const confirm = async () => {
    if (losing > 0 && !sure) return setSure(true)
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import impossible')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="t-subhead text-muted">
        Sauvegarde du {exportedOn(p.exportedAt)}
        {p.format === 0 && ' · ancienne version, convertie'}
        {p.otherSource && ' · vient de l’autre version de MOTIV (essai ou principale)'}
      </p>

      {p.identical ? (
        <p className="t-body">Ce fichier est identique à tes données : rien à importer.</p>
      ) : (
        <Group header="Ce téléphone → le fichier">
          {TABLES.map(({ key, label }) => (
            <Row key={key} title={label} detail={`${before(p.diff[key])} → ${after(p.diff[key])}`} />
          ))}
        </Group>
      )}

      {p.report && (
        <Group header="Conversion" footer="Les mouvements réunis partagent désormais leur historique et leurs records.">
          <Row
            title={`${plural(p.report.songs.toLearn, 'morceau', 'morceaux')} « à apprendre »`}
            subtitle="Jamais joués : ils restent proposés, pas « en cours »."
          />
          {p.report.merges.map((m) => (
            <Row key={m.exerciseName} title={m.exerciseName} subtitle={`Réunit ${m.names.map((n) => `« ${n} »`).join(' et ')}`} />
          ))}
          {p.report.movements.some((m) => m.own) && (
            <Row
              title={plural(new Set(p.report.movements.filter((m) => m.own).map((m) => m.exerciseId)).size, 'mouvement à toi', 'mouvements à toi')}
              subtitle="Noms absents de la bibliothèque : gardés tels quels, à compléter plus tard."
            />
          )}
        </Group>
      )}

      {p.warnings.length > 0 && (
        <Group header="À vérifier (rien n’est modifié)">
          {p.warnings.map((w) => (
            // En entier : le sous-titre d'une ligne est coupé à deux lignes.
            <Row key={w}>
              <span className="t-subhead text-muted">{w}</span>
            </Row>
          ))}
        </Group>
      )}

      {losing > 0 && (
        <Group header="Ce qui disparaîtra de ce téléphone" footer="Exporte d’abord tes données si tu veux les garder.">
          {p.removedSessions.map((s) => (
            <Row key={s.id} title={`${s.discipline === 'guitar' ? 'Guitare' : 'Sport'} · ${shortDate(s.day)}`} detail={`${s.durationMin} min`} />
          ))}
        </Group>
      )}

      {error && (
        <p role="alert" className="t-footnote px-4 text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {!p.identical && (
          <Button onClick={() => void confirm()} disabled={busy} tone={sure ? 'danger' : 'accent'}>
            {busy ? 'Import…' : sure ? `Oui, remplacer et perdre ${plural(losing, 'séance', 'séances')}` : 'Importer'}
          </Button>
        )}
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          {p.identical ? 'Fermer' : 'Annuler'}
        </Button>
      </div>
    </div>
  )
}
