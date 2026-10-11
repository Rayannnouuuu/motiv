import { useState } from 'react'
import { useActions, useAppData } from '../../data/AppDataContext'
import { canOfferEasier, canReroll, describeTarget } from '../../domain/challenges'
import { daysBetween } from '../../domain/date'
import type { Challenge } from '../../domain/types'
import { Card } from '../../ui/Card'

const DOMAIN_LABEL = { guitar: '🎸 Défi guitare', sport: '🏋️ Défi sport' }

export function ChallengeCard({ challenge, blocked }: { challenge: Challenge; blocked: boolean }) {
  const { data, today } = useAppData()
  const actions = useActions()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible pour le moment')
    } finally {
      setBusy(false)
    }
  }

  const blockedDays = challenge.blockedSince ? daysBetween(challenge.blockedSince, today) : 0

  return (
    <Card className={blocked ? 'border-accent' : ''}>
      <p className="text-xs text-muted">
        {DOMAIN_LABEL[challenge.domain]} · niveau {challenge.level}
        {challenge.easier && ' · version facile'}
      </p>
      <p className="mt-1 font-semibold">{describeTarget(challenge.target, data)}</p>
      {blocked && (
        <p className="mt-1 text-sm text-accent">
          Défi requis pour passer au niveau {challenge.level + 1}
          {blockedDays > 0 && ` · bloqué depuis ${blockedDays} j`}
        </p>
      )}
      <div className="mt-2 flex gap-4 text-sm">
        {canReroll(challenge) && (
          <button type="button" disabled={busy} className="text-muted underline" onClick={() => run(() => actions.rerollChallenge(challenge.id))}>
            Relancer
          </button>
        )}
        {canOfferEasier(challenge, today) && (
          <button type="button" disabled={busy} className="font-medium text-accent underline" onClick={() => run(() => actions.acceptEasier(challenge.id))}>
            Défi plus facile
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </Card>
  )
}
