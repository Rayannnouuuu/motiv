import { useActions, useAppData } from '../data/AppDataContext'
import type { RejectedEntry } from '../data/outbox'

const LABEL: Record<RejectedEntry['entry']['kind'], string> = {
  guitarSession: 'Log guitare',
  sportSession: 'Log sport',
  bodyMetric: 'Mesure',
}

const dayOf = ({ entry }: RejectedEntry) =>
  entry.kind === 'guitarSession' ? entry.payload.session.day : entry.payload.day

export function PendingBanner() {
  const { pendingCount, rejected, offline } = useAppData()
  const { discardRejected } = useActions()
  return (
    <>
      {rejected.map((r) => (
        <div key={r.entry.id} role="alert" className="t-subhead mt-3 rounded-md bg-surface px-4 py-3">
          <p>
            {LABEL[r.entry.kind]} du {dayOf(r)} refusé par le serveur : {r.message}
          </p>
          <button type="button" className="hit tap mt-1 font-semibold text-accent" onClick={() => discardRejected(r.entry.id)}>
            Ignorer
          </button>
        </div>
      ))}
      {(pendingCount > 0 || offline) && (
        <p role="status" className="t-footnote material pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-line px-3.5 py-1.5 font-medium text-ink shadow-card">
          {offline && 'Hors ligne · '}
          {pendingCount > 0
            ? `${pendingCount} ${pendingCount > 1 ? 'logs' : 'log'} en attente d'envoi`
            : 'tout est gardé sur le téléphone'}
        </p>
      )}
    </>
  )
}
