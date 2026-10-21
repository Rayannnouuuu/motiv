import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useActions, useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { TONE } from '../../design/tone'
import { challengeProgress, challengeRoute } from '../../domain/challengeProgress'
import { canOfferEasier, canReroll, describeTarget } from '../../domain/challenges'
import { doneRuns } from '../../domain/marathon/runs'
import type { Challenge } from '../../domain/types'
import { Gauge } from '../../ui/Gauge'

const DOMAIN_LABEL = { guitar: 'Objectif guitare', sport: 'Objectif sport' }
const MAX_REROLLS = 2

const num = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const { data, v1, today } = useAppData()
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

  const p = challengeProgress(challenge, data, today, doneRuns(v1.sessions))
  const progressText = p.unit === 'morceau' ? (p.current >= 1 ? 'Maîtrisé' : 'Pas encore maîtrisé') : `${num(p.current)} / ${num(p.target)} ${p.unit}`
  const d = challenge.domain

  return (
    <div role="region" aria-label={DOMAIN_LABEL[challenge.domain]}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="tap-row flex w-full items-center gap-3 px-4 py-3 text-left">
        <span aria-hidden className={`flex size-7.5 shrink-0 items-center justify-center rounded-sm ${TONE.tint[d]}`}>
          <Icon name={d} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex items-center gap-2">
            <span className="t-headline line-clamp-2 min-w-0 flex-1">{describeTarget(challenge.target, data)}</span>
          </span>
          <span className="flex items-center gap-2.5">
            <Gauge value={p.current} max={p.target} color={d} label={`Progression de l'objectif : ${progressText}`} className="h-1.5" />
            <span className="t-caption shrink-0 font-semibold text-muted tabular-nums">{progressText}</span>
          </span>
        </span>
        <Icon name="chevron" size="1.4em" className={`-mx-1.5 text-faint transition-transform duration-300 ease-spring ${open ? '-rotate-90' : 'rotate-90'}`} />
      </button>

      {open && (
        <div className="animate-rise t-subhead flex flex-col gap-3 px-4 pb-4 pl-15">
          <p className="text-muted">{challenge.easier ? 'Version plus facile · ' : ''}Seules les séances faites depuis le début de l'objectif comptent.</p>
          <Link
            to={challengeRoute(challenge)}
            className={`tap-scale t-headline flex min-h-11 items-center justify-center rounded-md px-4 py-2.5 ${TONE.tint[d]}`}
          >
            S'entraîner →
          </Link>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {canReroll(challenge) && (
              <button
                type="button"
                disabled={busy}
                className={`hit tap py-1 disabled:opacity-35 ${TONE.text[d]}`}
                onClick={() => run(() => actions.rerollChallenge(challenge.id))}
              >
                Changer d'objectif ({MAX_REROLLS - challenge.rerolls} restant{MAX_REROLLS - challenge.rerolls > 1 ? 's' : ''})
              </button>
            )}
            {canOfferEasier(challenge, today) && (
              <button
                type="button"
                disabled={busy}
                className={`hit tap py-1 font-semibold disabled:opacity-35 ${TONE.text[d]}`}
                onClick={() => run(() => actions.acceptEasier(challenge.id))}
              >
                Objectif plus facile
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
