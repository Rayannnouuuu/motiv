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
    <div role="region" aria-label={DOMAIN_LABEL[challenge.domain]}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="tap-row flex w-full items-center gap-3 px-4 py-3 text-left">
        <span
          aria-hidden
          className={`flex h-[1.875rem] w-[1.875rem] shrink-0 items-center justify-center rounded-[0.5rem] text-[0.9375rem] ${challenge.domain === 'guitar' ? 'bg-guitar/15' : 'bg-sport/15'}`}
        >
          {DOMAIN_ICON[challenge.domain]}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex items-center gap-2">
            <span className="t-headline line-clamp-2 min-w-0 flex-1">{describeTarget(challenge.target, data)}</span>
            {blocked && <span className="t-caption shrink-0 rounded-full bg-accent px-2 py-0.5 font-semibold text-white">Bloquant</span>}
          </span>
          <span className="flex items-center gap-2.5">
            <Gauge value={p.current} max={p.target} color={challenge.domain} label={`Progression du défi : ${progressText}`} className="h-1.5" />
            <span className="t-caption shrink-0 font-semibold text-muted tabular-nums">{progressText}</span>
          </span>
        </span>
        <svg width="13" height="8" viewBox="0 0 13 8" aria-hidden className={`shrink-0 text-faint transition-transform duration-300 ease-spring ${open ? 'rotate-180' : ''}`}>
          <path d="M1.5 1.5 6.5 6.5 11.5 1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="animate-rise t-subhead flex flex-col gap-3 px-4 pb-4 pl-[3.75rem]">
          <p className="text-muted">
            Défi du niveau {challenge.level} → {challenge.level + 1}
            {challenge.easier && ' · version facile'} · seuls les logs faits depuis le début du défi comptent.
          </p>
          {blocked ? (
            <div className="rounded-[0.75rem] bg-accent/10 px-3 py-2.5">
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
            className={`tap-scale t-headline rounded-[0.75rem] px-4 py-2.5 text-center ${blocked ? 'bg-accent text-white' : 'bg-accent/12 text-accent'}`}
          >
            S'entraîner →
          </Link>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {canReroll(challenge) && (
              <button type="button" disabled={busy} className="tap py-1 text-accent disabled:opacity-35" onClick={() => run(() => actions.rerollChallenge(challenge.id))}>
                Relancer ({MAX_REROLLS - challenge.rerolls} restante{MAX_REROLLS - challenge.rerolls > 1 ? 's' : ''})
              </button>
            )}
            {canOfferEasier(challenge, today) && (
              <button type="button" disabled={busy} className="tap py-1 font-semibold text-accent disabled:opacity-35" onClick={() => run(() => actions.acceptEasier(challenge.id))}>
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
