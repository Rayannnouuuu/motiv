import { useAppData } from '../data/AppDataContext'

export function PendingBanner() {
  const { pendingCount } = useAppData()
  if (pendingCount === 0) return null
  return (
    <p role="status" className="mb-3 rounded-xl bg-surface-2 px-3 py-2 text-center text-sm text-muted">
      {pendingCount} {pendingCount > 1 ? 'logs' : 'log'} en attente d'envoi
    </p>
  )
}
