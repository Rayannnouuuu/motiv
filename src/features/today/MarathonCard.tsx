import { Link } from 'react-router-dom'
import { Icon } from '../../design/icons'
import { plannedOn } from '../../domain/marathon/plan'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { dayLabel, km, paceText, runLabel } from '../marathon/format'
import { useStartPlanned } from '../marathon/useStartPlanned'
import { useMarathon } from '../marathon/useMarathon'

/** Aujourd'hui : le compte à rebours et la séance du plan marathon, qui se lance d'un toucher (lot 3). */
export function MarathonCard() {
  const mk = useMarathon()
  const start = useStartPlanned()
  if (!mk) return null
  const { m, plan, today, daysLeft } = mk
  const todays = plan ? plannedOn(plan, today) : { runs: [], strength: [] }
  const next = plan?.weeks.flatMap((w) => w.runs).find((r) => r.day > today)

  return (
    <Card className="flex flex-col gap-3" role="region" aria-labelledby="marathon-title">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="marathon-title" className="t-title3 flex items-center gap-2">
          <Icon name="sport" className="text-sport" />
          Marathon
        </h2>
        {daysLeft >= 0 && <p className="t-headline text-sport tabular-nums">J-{daysLeft}</p>}
      </div>
      {!plan ? (
        <p className="t-subhead">Pas de plan pour cette date : regarde les autres chemins proposés.</p>
      ) : (
        <>
          {plan.frozen && <p className="t-subhead rounded-md bg-record/15 px-3 py-2">{plan.frozen}</p>}
          {todays.runs.map((r) => (
            <div key={r.kind} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="t-headline">
                  {runLabel(r, m.race.kind)}
                  {r.km > 0 && <span className="font-normal text-muted"> · {km(r.km)}</span>}
                </p>
                {r.pace && <p className="t-footnote text-sport">{paceText(plan.paces, r.pace)}</p>}
              </div>
              {r.kind !== 'cross' && (
                <Button tone="sport" className="shrink-0 px-4 py-2" aria-label={`Commencer : ${runLabel(r, m.race.kind)}`} onClick={() => start.run(r)}>
                  <Icon name="play" />
                  Go
                </Button>
              )}
            </div>
          ))}
          {todays.strength.map((s) => (
            <div key={s.day} className="flex items-center gap-3">
              <p className="t-headline flex-1">Renfo coureur{s.light && <span className="font-normal text-muted"> · léger</span>}</p>
              <Button tone="sport" variant="secondary" className="shrink-0 px-4 py-2" aria-label="Commencer : renfo coureur" onClick={start.strength}>
                Go
              </Button>
            </div>
          ))}
          {todays.runs.length === 0 && todays.strength.length === 0 && (
            <p className="t-subhead text-muted">
              Repos aujourd'hui.
              {next && ` Prochaine sortie ${dayLabel(next.day)} : ${runLabel(next, m.race.kind).toLowerCase()}${next.km > 0 ? `, ${km(next.km)}` : ''}.`}
            </p>
          )}
        </>
      )}
      <Link to="/marathon" className="hit tap t-subhead self-start text-sport">
        Voir le plan
      </Link>
    </Card>
  )
}
