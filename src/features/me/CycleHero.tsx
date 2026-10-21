import { useState } from 'react'
import { useActions, useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { TONE } from '../../design/tone'
import { challengeProgress } from '../../domain/challengeProgress'
import { describeTarget } from '../../domain/challenges'
import { CYCLE_WEEKS, cycleEnd, cycleState, proposeTargets, recordsBetween } from '../../domain/cycles'
import { daysBetween } from '../../domain/date'
import { doneRuns } from '../../domain/marathon/runs'
import type { Challenge, Domain } from '../../domain/types'
import { Button } from '../../ui/Button'
import { Hero } from '../../ui/Hero'
import { Segments } from '../../ui/SessionBar'
import { useMarathon } from '../marathon/useMarathon'
import { useRun } from '../settings/useRun'
import { ChallengeCard } from '../today/ChallengeCard'

const UNIVERSE: Record<Domain, string> = { guitar: 'Guitare', sport: 'Sport' }
const num = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })

/** Avant / après d'un objectif : d'où l'on partait, où l'on en est. */
function BeforeAfter({ challenge }: { challenge: Challenge }) {
  const { data, v1, today } = useAppData()
  const p = challengeProgress(challenge, data, today, doneRuns(v1.sessions))
  const t = challenge.target
  const before = 'baseline' in t && t.baseline !== null ? `${num(t.baseline)} ${p.unit}` : '—'
  const after = p.unit === 'morceau' ? (p.current >= 1 ? 'maîtrisé' : 'pas encore') : `${num(p.current)} ${p.unit}`
  const reached = challenge.status === 'done'
  return (
    <li className="flex items-start gap-3 px-3 py-2.5">
      <Icon name={reached ? 'check' : challenge.domain} className={`mt-0.5 ${TONE.text[challenge.domain]}`} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="t-subhead font-semibold">{describeTarget(t, data)}</span>
        <span className="t-footnote text-muted tabular-nums">
          {UNIVERSE[challenge.domain]} · avant {before} → après {after}
          {reached ? ' · atteint' : ''}
        </span>
      </span>
    </li>
  )
}

/**
 * Moi › cycle de 6 semaines (lot 4) : le lancer avec ses deux objectifs phares, le suivre semaine par semaine,
 * puis faire le bilan (avant / après, records, ce que je garde) et enchaîner sur le suivant.
 */
export function CycleHero() {
  const { data, v1, today } = useAppData()
  const mk = useMarathon()
  const { startCycle, saveCycleReview } = useActions()
  const { busy, error, run } = useRun()
  const [keep, setKeep] = useState('')
  const state = cycleState(v1.profile.cycles, today)
  // Tiré une fois à l'ouverture : la proposition ne change pas sous les yeux.
  const [proposal] = useState(() => proposeTargets(data, today, Math.random, mk?.plan))
  const objectives = (c: { guitar: string | null; sport: string | null }) =>
    (['guitar', 'sport'] as const).flatMap((d) => data.challenges.filter((x) => x.id === c[d]))

  if (state.kind === 'running') {
    const days = daysBetween(state.cycle.start, today)
    return (
      <Hero
        tone="accent"
        icon="target"
        overline={`Cycle ${state.number} en cours`}
        aside={`S${state.week}/${CYCLE_WEEKS}`}
        titleId="cycle-title"
        title={`Semaine ${state.week} sur ${CYCLE_WEEKS}`}
      >
        <Segments
          tone="sport"
          parts={Array.from({ length: CYCLE_WEEKS }, (_, i) => Math.min(1, Math.max(0, (days + 1 - i * 7) / 7)))}
          current={state.week - 1}
          label={`Semaine ${state.week} sur ${CYCLE_WEEKS}`}
        />
        <div className="rows -mx-1 overflow-hidden rounded-lg bg-inset">
          {objectives(state.cycle).map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </div>
      </Hero>
    )
  }

  if (state.kind === 'review') {
    const records = recordsBetween(data, state.cycle.start, cycleEnd(state.cycle))
    return (
      <Hero
        tone="accent"
        icon="target"
        overline={`Bilan du cycle ${state.number}`}
        titleId="cycle-title"
        title="6 semaines, le bilan"
        subtitle="Deux minutes pour garder ce qui a marché."
      >
        <ul className="rows overflow-hidden rounded-lg bg-inset">
          {objectives(state.cycle).map((c) => (
            <BeforeAfter key={c.id} challenge={c} />
          ))}
        </ul>
        <p className="t-subhead">
          Records pendant le cycle : <span className="font-semibold tabular-nums">{records.guitar}</span> guitare ·{' '}
          <span className="font-semibold tabular-nums">{records.sport}</span> sport
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="t-headline">Ce que je garde</span>
          <textarea
            value={keep}
            onChange={(e) => setKeep(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Une habitude, un exo, un horaire qui a marché…"
            className="t-body resize-none rounded-md bg-inset px-4 py-3 outline-none placeholder:text-muted"
          />
        </label>
        {error && (
          <p role="alert" className="t-footnote text-danger">
            {error}
          </p>
        )}
        <Button
          disabled={busy}
          className="w-full"
          onClick={() =>
            void run(async () => {
              await saveCycleReview(keep)
              await startCycle(proposal)
            })
          }
        >
          Lancer le cycle suivant
        </Button>
      </Hero>
    )
  }

  return (
    <Hero
      tone="accent"
      icon="target"
      overline="Cycle de 6 semaines"
      titleId="cycle-title"
      title="Lance ton prochain cycle"
      subtitle="Un objectif phare par discipline, 6 semaines pour l'atteindre."
    >
      <ul className="rows overflow-hidden rounded-lg bg-inset">
        {(['guitar', 'sport'] as const).map((d) => (
          <li key={d} className="flex items-center gap-3 px-3 py-2.5">
            <Icon name={d} className={TONE.text[d]} />
            <span className="t-subhead flex-1 font-semibold">{describeTarget(proposal[d], data)}</span>
          </li>
        ))}
      </ul>
      {mk?.plan && (
        <p className="t-footnote text-muted">Pendant le plan marathon, l'objectif sport suit le plan : la plus longue sortie prévue dans le cycle.</p>
      )}
      {error && (
        <p role="alert" className="t-footnote text-danger">
          {error}
        </p>
      )}
      <Button disabled={busy} className="w-full" onClick={() => void run(() => startCycle(proposal))}>
        Lancer le cycle
      </Button>
    </Hero>
  )
}
