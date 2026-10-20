import { Link, useNavigate } from 'react-router-dom'
import { useActions, useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { shortDate, weekStart } from '../../domain/date'
import { formatDuration } from '../../domain/marathon/paces'
import { PHASE_LABELS, type PlanWeek } from '../../domain/marathon/plan'
import { RACE_LABELS } from '../../domain/marathon/profile'
import { RUN_MOVEMENT_ID } from '../../domain/marathon/runs'
import { runnerMoves, STRENGTH_PURPOSE } from '../../domain/marathon/strength'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Gauge } from '../../ui/Gauge'
import { Group, Row } from '../../ui/List'
import { Screen } from '../../ui/Screen'
import { Switch } from '../../ui/Switch'
import { dayLabel, km, paceText, runLabel } from './format'
import { useMarathon } from './useMarathon'
import { useStartPlanned } from './useStartPlanned'

type Marathon = NonNullable<ReturnType<typeof useMarathon>>

/** Les séances d'une semaine, jour par jour ; celles du jour se lancent. */
export function WeekSessions({ week, mk, today }: { week: PlanWeek; mk: Marathon; today: string }) {
  const { v1 } = useAppData()
  const start = useStartPlanned()
  const ranOn = (day: string) => v1.sessions.some((s) => s.day === day && s.blocks.some((b) => b.entries.some((e) => e.exerciseId === RUN_MOVEMENT_ID)))
  const days = [...new Set([...week.runs.map((r) => r.day), ...week.strength.map((s) => s.day)])].sort()
  return (
    <>
      {days.map((day) => {
        const runs = week.runs.filter((r) => r.day === day)
        const strength = week.strength.find((s) => s.day === day)
        const isToday = day === today
        return (
          <div key={day} className={`flex flex-col gap-1 px-4 py-2.5 ${isToday ? 'bg-sport/8' : ''}`}>
            <p className="t-footnote font-semibold text-muted uppercase">
              {isToday ? "Aujourd'hui" : dayLabel(day)}
              {ranOn(day) && (
                <span className="ml-1.5 text-sport normal-case">
                  <Icon name="check" /> fait
                </span>
              )}
            </p>
            {runs.map((r) => (
              <div key={r.kind} className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="t-headline flex items-center gap-1.5">
                    <Icon name="sport" className="text-sport" />
                    {runLabel(r, mk.m.race.kind)}
                    {r.km > 0 && <span className="font-normal text-muted"> · {km(r.km)}</span>}
                  </p>
                  <p className="t-subhead text-muted">{r.detail}</p>
                  {r.pace && mk.plan && <p className="t-footnote text-sport">{paceText(mk.plan.paces, r.pace)}</p>}
                </div>
                {isToday && r.kind !== 'cross' && (
                  <Button tone="sport" className="shrink-0 px-4 py-2" aria-label={`Commencer : ${runLabel(r, mk.m.race.kind)}`} onClick={() => start.run(r)}>
                    <Icon name="play" />
                    Go
                  </Button>
                )}
              </div>
            ))}
            {strength && (
              <div className="flex items-center gap-3">
                <p className="t-headline flex flex-1 items-center gap-1.5">
                  <Icon name="muscu" className="text-sport" />
                  <span>
                    {strength.name}
                    {strength.light && <span className="font-normal text-muted"> · léger</span>}
                    {runs.length > 0 && <span className="t-subhead font-normal text-muted"> · après la course</span>}
                  </span>
                </p>
                {isToday && (
                  <Button
                    tone="sport"
                    variant="secondary"
                    className="shrink-0 px-4 py-2"
                    aria-label={`Commencer : ${strength.name}`}
                    onClick={() => start.strength(strength.programId)}
                  >
                    Go
                  </Button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

function Refusal({ mk }: { mk: Marathon }) {
  const { saveMarathon } = useActions()
  const navigate = useNavigate()
  const { m, f, today } = mk
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-2">
        <h2 className="t-title3">Pas de plan pour cette date</h2>
        <ul className="t-body flex list-disc flex-col gap-1 pl-5">
          {f.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Card>
      <Group header="Trois autres chemins">
        {f.options.map((o) =>
          o.kind === 'later' ? (
            <Row key={o.kind} title="Choisir une course plus tardive" subtitle={o.why} onClick={() => navigate('/marathon/profil')} />
          ) : (
            <Row
              key={o.kind}
              title={o.kind === 'walkRun' ? 'Finir en alternant course et marche' : 'Viser un semi-marathon'}
              subtitle={o.why}
              chevron={o.available}
              onClick={
                o.available
                  ? () =>
                      void saveMarathon(
                        o.kind === 'walkRun' ? { ...m, walkRun: true, startedOn: today } : { ...m, race: { ...m.race, kind: 'half' }, startedOn: today },
                      )
                  : undefined
              }
            />
          ),
        )}
      </Group>
      <p className="t-footnote px-4 text-muted">{f.medical}</p>
    </div>
  )
}

function PlanView({ mk }: { mk: Marathon }) {
  const { setSickWeek } = useActions()
  const { m, plan, today, daysLeft } = mk
  if (!plan) return null
  const week = plan.weeks[plan.current]
  const monday = weekStart(today)
  const p = plan.paces

  if (!week)
    return (
      <Card>
        <p className="t-body">
          {daysLeft < 0 ? 'La course est passée. Bravo pour la préparation ! Change la date pour en préparer une autre.' : 'Le plan commence lundi.'}
        </p>
      </Card>
    )

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <h2 className="t-title3 truncate">{m.race.name || RACE_LABELS[m.race.kind]}</h2>
            <p className="t-subhead text-muted">
              {RACE_LABELS[m.race.kind]} · {shortDate(m.race.day)}
              {plan.walkRun && ' · course-marche'}
            </p>
          </div>
          <p className="t-title1 shrink-0 text-sport tabular-nums">J-{daysLeft}</p>
        </div>
        <p className="t-subhead">
          Semaine {week.index + 1}/{plan.weeks.length} · {PHASE_LABELS[week.phase]}
          {week.deload && ' · allégée'}
          {week.sick && ' · malade'}
        </p>
        <Gauge value={week.doneKm ?? 0} max={Math.max(1, week.km)} color="sport" label="Km de la semaine" className="h-1.5" />
        <p className="t-footnote text-muted tabular-nums">
          {km(week.doneKm ?? 0)} faits sur {km(week.km)} prévus
        </p>
        {[plan.frozen, ...plan.alerts].filter(Boolean).map((a) => (
          <p key={a} role="status" className="t-subhead rounded-md bg-record/15 px-3 py-2">
            {a}
          </p>
        ))}
      </Card>

      <Group header="Cette semaine" labelledBy="marathon-week">
        <WeekSessions week={week} mk={mk} today={today} />
      </Group>

      <Group
        header="Tes allures"
        labelledBy="marathon-paces"
        footer={
          p.source === 'chrono'
            ? `Depuis ton chrono, avec une marge prudente : objectif ${formatDuration(p.predictedSec!)}.`
            : 'Sans chrono : au ressenti. Un chrono battu en sortie les calcule.'
        }
      >
        {(['easy', 'long', 'marathon', 'threshold', 'intervals'] as const).map((k) => (
          <Row
            key={k}
            title={
              {
                easy: 'Footing',
                long: 'Sortie longue',
                marathon: m.race.kind === 'marathon' ? 'Allure marathon' : 'Allure semi',
                threshold: 'Seuil',
                intervals: 'Fractionné',
              }[k]
            }
            subtitle={paceText(p, k)}
          />
        ))}
      </Group>
      {p.notes.length > 0 && (
        <ul className="t-footnote -mt-4 flex flex-col gap-1 px-4 text-muted">
          {p.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <Group
        header="Muscu dans le plan"
        footer="Ta rotation (Push, Pull, Legs…) est placée autour des sorties : jambes jamais la veille d'une sortie longue ou d'une séance dure, ni le lendemain de la sortie longue ; haut du corps de préférence un jour sans course."
      >
        <Row title="Base et développement" detail="3 par semaine" />
        <Row title="Semaine allégée" detail="une de moins" />
        <Row title="Spécifique" detail="2, jambes → renfo coureur" />
        <Row title="Affûtage" detail="1 légère, puis rien" />
      </Group>

      <Group header={`Renfo coureur · ${m.constraints.gym ? 'salle' : 'maison'}`} footer={`${STRENGTH_PURPOSE} Modifiable dans Bibliothèque › Modèles.`}>
        {runnerMoves(m.constraints.gym).map((x) => (
          <Row key={x.movementId} title={x.name} detail={`${x.sets}×${x.reps}`} />
        ))}
      </Group>

      <Group header="Tout le plan">
        {plan.weeks.map((w) => (
          <details key={w.start} open={w.index === plan.current} className="group">
            <summary className="tap-row flex cursor-pointer items-center gap-3 px-4 py-2.5">
              <span className={`t-subhead w-10 tabular-nums ${w.index === plan.current ? 'font-semibold text-sport' : 'text-muted'}`}>S{w.index + 1}</span>
              <span className="t-body min-w-0 flex-1">
                {PHASE_LABELS[w.phase]}
                {w.deload && <span className="text-muted"> · allégée</span>}
                {w.sick && <span className="text-muted"> · malade</span>}
              </span>
              <span className="t-subhead text-muted tabular-nums">
                {w.doneKm !== null && w.index < plan.current ? `${km(w.doneKm)} / ` : ''}
                {km(w.km)}
              </span>
            </summary>
            <div className="rows border-t border-line">
              <WeekSessions week={w} mk={mk} today={today} />
            </div>
          </details>
        ))}
      </Group>

      <Group footer="La semaine devient allégée, sans séance dure ni renfo.">
        <Row
          title="Malade cette semaine"
          accessory={<Switch label="Malade cette semaine" checked={m.sickWeeks.includes(monday)} onChange={(v) => void setSickWeek(monday, v)} />}
        />
      </Group>
      <p className="t-footnote px-4 text-muted">{mk.f.medical}</p>
    </div>
  )
}

/** Moi › Marathon : le plan, ou le questionnaire s'il n'est pas encore rempli (lot 3). */
export function MarathonPage() {
  const mk = useMarathon()
  const navigate = useNavigate()
  const back = (
    <Link to="/moi" className="hit tap t-body flex items-center text-sport">
      <Icon name="chevron" size="1.4em" className="rotate-180" />
      Moi
    </Link>
  )
  return (
    <Screen
      title="Marathon"
      leading={back}
      trailing={
        mk && (
          <Link to="/marathon/profil" className="hit tap t-body text-sport">
            Profil
          </Link>
        )
      }
    >
      <div className="flex flex-col gap-6 pb-4">
        {!mk ? (
          <Card className="flex flex-col gap-3">
            <p className="t-body">
              Un plan de préparation construit à rebours depuis ta date de course, adapté à ton niveau, et qui se recalcule chaque lundi d'après ce que tu as
              vraiment fait.
            </p>
            <Button tone="sport" onClick={() => navigate('/marathon/profil')}>
              Remplir le questionnaire
            </Button>
          </Card>
        ) : mk.f.ok ? (
          <PlanView mk={mk} />
        ) : (
          <Refusal mk={mk} />
        )}
      </div>
    </Screen>
  )
}
