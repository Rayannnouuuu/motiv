import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useActions, useAppData } from '../../data/AppDataContext'
import { challengeProgress, challengeRoute } from '../../domain/challengeProgress'
import { canOfferEasier, canReroll, describeTarget } from '../../domain/challenges'
import { daysBetween } from '../../domain/date'
import type { DomainLevel } from '../../domain/levels'
import type { Challenge } from '../../domain/types'
import { Card } from '../../ui/Card'
import { Gauge } from '../../ui/Gauge'

const DOMAIN_LABEL = { guitar: '🎸 Défi guitare', sport: '🏋️ Défi sport' }
const MAX_REROLLS = 2

const num = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })

export function ChallengeCard({ challenge, level }: { challenge: Challenge; level: DomainLevel }) {
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

  const blocked = level.blocked
  const blockedDays = challenge.blockedSince ? daysBetween(challenge.blockedSince, today) : 0
  const p = challengeProgress(challenge, data, today)
  const progressText =
    p.unit === 'morceau' ? (p.current >= 1 ? 'Maîtrisé ✓' : 'Pas encore maîtrisé') : `${num(p.current)} / ${num(p.target)} ${p.unit}`
  const xpLeft = level.perLevel - level.xpInLevel

  return (
    <Card className={`flex flex-col gap-3 ${blocked ? 'border-2 border-accent' : ''}`} role="region" aria-label={DOMAIN_LABEL[challenge.domain]}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{DOMAIN_LABEL[challenge.domain]}</p>
        <p className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
          Niveau {challenge.level} → {challenge.level + 1}
          {challenge.easier && ' · version facile'}
        </p>
      </div>

      <p className="text-xl font-bold">{describeTarget(challenge.target, data)}</p>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Depuis le début du défi</span>
          <span className="font-semibold tabular-nums">{progressText}</span>
        </div>
        <Gauge value={p.current} max={p.target} color={challenge.domain} label={`Progression du défi : ${progressText}`} className="h-2.5" />
      </div>

      {blocked ? (
        <div className="rounded-xl bg-accent/10 px-3 py-2 text-sm">
          <p className="font-semibold text-accent">
            Défi requis : ta jauge est pleine, réussis-le pour passer au niveau {challenge.level + 1}.
          </p>
          <p className="text-muted">
            {level.reserve > 0 ? `+${level.reserve} XP en réserve, versés dès la réussite` : "L'XP gagnée part en réserve en attendant"}
            {blockedDays > 0 && ` · bloqué depuis ${blockedDays} j`}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">Réussis-le avant les {xpLeft} XP restants du niveau pour passer sans attendre.</p>
      )}

      <Link
        to={challengeRoute(challenge)}
        className={`rounded-xl px-4 py-3 text-center font-semibold ${blocked ? 'bg-accent text-white' : 'border border-accent text-accent'}`}
      >
        S'entraîner →
      </Link>

      <div className="flex gap-4 text-sm">
        {canReroll(challenge) && (
          <button type="button" disabled={busy} className="text-muted underline" onClick={() => run(() => actions.rerollChallenge(challenge.id))}>
            Relancer ({MAX_REROLLS - challenge.rerolls} restante{MAX_REROLLS - challenge.rerolls > 1 ? 's' : ''})
          </button>
        )}
        {canOfferEasier(challenge, today) && (
          <button type="button" disabled={busy} className="font-medium text-accent underline" onClick={() => run(() => actions.acceptEasier(challenge.id))}>
            Défi plus facile
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </Card>
  )
}
