import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useActions, useAppData } from '../../data/AppDataContext'
import { challengeProgress, challengeRoute } from '../../domain/challengeProgress'
import { canOfferEasier, canReroll, describeTarget } from '../../domain/challenges'
import { daysBetween } from '../../domain/date'
import type { DomainLevel } from '../../domain/levels'
import type { Challenge } from '../../domain/types'
import { Gauge } from '../../ui/Gauge'

const DOMAIN_LABEL = { guitar: '🎸 Défi guitare', sport: '🏋️ Défi sport' }
const DOMAIN_ICON = { guitar: '🎸', sport: '🏋️' }
const MAX_REROLLS = 2

const num = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })

export function ChallengeCard({ challenge, level }: { challenge: Challenge; level: DomainLevel }) {
  const { data, today } = useAppData()
  const actions = useActions()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

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
    <div className={`rounded-xl bg-surface ${blocked ? 'ring-2 ring-accent' : ''}`} role="region" aria-label={DOMAIN_LABEL[challenge.domain]}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full flex-col gap-1.5 px-3 py-2.5 text-left">
        <span className="flex items-center gap-2">
          <span aria-hidden>{DOMAIN_ICON[challenge.domain]}</span>
          <span className="min-w-0 flex-1 truncate font-semibold">{describeTarget(challenge.target, data)}</span>
          {blocked && <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">Bloquant</span>}
          <span className="shrink-0 text-muted" aria-hidden>
            {open ? '▴' : '▾'}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <Gauge value={p.current} max={p.target} color={challenge.domain} label={`Progression du défi : ${progressText}`} className="h-1.5" />
          <span className="shrink-0 text-xs font-semibold tabular-nums">{progressText}</span>
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-line px-3 py-3 text-sm">
          <p className="text-muted">
            Défi du niveau {challenge.level} → {challenge.level + 1}
            {challenge.easier && ' · version facile'} · seuls les logs faits depuis le début du défi comptent.
          </p>
          {blocked ? (
            <div className="rounded-lg bg-accent/10 px-3 py-2">
              <p className="font-semibold text-accent">Défi requis : ta jauge est pleine, réussis-le pour passer au niveau {challenge.level + 1}.</p>
              <p className="text-muted">
                {level.reserve > 0 ? `+${level.reserve} XP en réserve, versés dès la réussite` : "L'XP gagnée part en réserve en attendant"}
                {blockedDays > 0 && ` · bloqué depuis ${blockedDays} j`}
              </p>
            </div>
          ) : (
            <p className="text-muted">Réussis-le avant les {xpLeft} XP restants du niveau pour passer sans attendre.</p>
          )}
          <Link
            to={challengeRoute(challenge)}
            className={`rounded-xl px-4 py-2.5 text-center font-semibold ${blocked ? 'bg-accent text-white' : 'border border-accent text-accent'}`}
          >
            S'entraîner →
          </Link>
          <div className="flex gap-4">
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
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
)
}
