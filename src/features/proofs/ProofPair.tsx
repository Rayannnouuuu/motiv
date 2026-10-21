import { useState } from 'react'
import { shortDate } from '../../domain/date'
import type { Proof } from '../../domain/model'
import { gapLabel } from '../../domain/proofs'
import { useMediaUrl } from './media'

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

/** Un fichier de preuve : lecteur audio ou photo ; absent si la sauvegarde importée était « sans médias ». */
export function MediaView({ proof, label }: { proof: Proof; label: string }) {
  const url = useMediaUrl(proof.id, proof.mime)
  if (url === undefined) return <div className="aspect-[3/4] rounded-lg bg-inset" aria-busy />
  if (url === null) return <p className="t-footnote rounded-lg bg-inset p-3 text-muted">Fichier absent de ce téléphone.</p>
  return proof.kind === 'audio' ? (
    <audio controls preload="metadata" src={url} aria-label={label} className="w-full" />
  ) : (
    <img src={url} alt={label} className="aspect-[3/4] w-full rounded-lg bg-inset object-cover" />
  )
}

/** Côte à côte (photos) ou l'un sous l'autre (audio) : il y a un mois, aujourd'hui. */
export function ProofPair({ then, now, days }: { then: Proof | null; now: Proof; days: number | null }) {
  const side = (p: Proof, title: string) => (
    <figure className="flex min-w-0 flex-1 flex-col gap-1.5">
      <figcaption className="t-footnote flex justify-between gap-2 text-muted">
        <span className="font-semibold text-ink">{title}</span>
        <span className="tabular-nums">
          {shortDate(p.day)}
          {p.durationSec ? ` · ${clock(p.durationSec)}` : ''}
        </span>
      </figcaption>
      <MediaView proof={p} label={`${title}, ${shortDate(p.day)}`} />
    </figure>
  )
  return (
    <div className={`flex gap-3 ${now.kind === 'audio' ? 'flex-col' : ''}`}>
      {then && side(then, days === null ? 'Avant' : gapLabel(days).replace(/^./, (c) => c.toUpperCase()))}
      {side(now, 'Dernière')}
    </div>
  )
}

/** Toutes les preuves d'un sujet ; supprimer demande un second toucher. */
export function ProofList({ proofs, onDelete }: { proofs: Proof[]; onDelete: (id: string) => void }) {
  const [asked, setAsked] = useState<string | null>(null)
  if (proofs.length < 2) return null
  return (
    <details className="t-subhead">
      <summary className="tap cursor-pointer py-2 text-muted">Tout voir ({proofs.length})</summary>
      <ul className="rows mt-1 overflow-hidden rounded-lg bg-inset">
        {proofs.map((p) => (
          <li key={p.id} className="flex flex-col gap-2 px-3 py-2.5">
            <span className="flex items-center justify-between gap-3">
              <span className="tabular-nums">
                {shortDate(p.day)}
                {p.durationSec ? ` · ${clock(p.durationSec)}` : ''}
              </span>
              <button type="button" className="hit tap t-footnote text-danger" onClick={() => (asked === p.id ? onDelete(p.id) : setAsked(p.id))}>
                {asked === p.id ? 'Confirmer' : 'Supprimer'}
              </button>
            </span>
            <MediaView proof={p} label={shortDate(p.day)} />
          </li>
        ))}
      </ul>
    </details>
  )
}
