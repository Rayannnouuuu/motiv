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
  const { pendingCount, rejected } = useAppData()
  const { discardRejected } = useActions()
  return (
    <>
      {rejected.map((r) => (
        <div key={r.entry.id} role="alert" className="mb-3 rounded-xl bg-surface-2 px-3 py-2 text-sm">
          <p>
            {LABEL[r.entry.kind]} du {dayOf(r)} refusé par le serveur : {r.message}
          </p>
          <button type="button" className="mt-1 font-semibold text-accent" onClick={() => discardRejected(r.entry.id)}>
            Ignorer
          </button>
        </div>
      ))}
      {pendingCount > 0 && (
        <p role="status" className="mb-3 rounded-xl bg-surface-2 px-3 py-2 text-center text-sm text-muted">
          {pendingCount} {pendingCount > 1 ? 'logs' : 'log'} en attente d'envoi
        </p>
      )}
    </>
  )
}
