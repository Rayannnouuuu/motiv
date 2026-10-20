import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { Icon, type IconName } from '../../design/icons'
import { TONE } from '../../design/tone'
import { addDays, isoWeek, shortDate, weekStart } from '../../domain/date'
import { PHASE_LABELS, type Phase, type Plan } from '../../domain/marathon/plan'
import { runOf } from '../../domain/marathon/runs'
import { RUNNER_TEMPLATE_ID } from '../../domain/marathon/strength'
import type { Domain } from '../../domain/types'
import { weekGoals } from '../../domain/weekGoals'
import { Gauge } from '../../ui/Gauge'
import { Hero } from '../../ui/Hero'
import { SectionHeader } from '../../ui/List'
import { Pill } from '../../ui/Pill'
import { Screen } from '../../ui/Screen'
import { km, runLabel } from '../marathon/format'
import { useMarathon } from '../marathon/useMarathon'
import { useStartPlanned } from '../marathon/useStartPlanned'
import { currentWeek, planWeekLabel, planWeekProgress } from './planWeek'

const PHASES: Phase[] = ['base', 'development', 'specific', 'taper']
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

/** Les 4 phases du plan, à la largeur de leur nombre de semaines ; la phase en cours et celles d'avant en couleur. */
function PhaseBar({ plan }: { plan: Plan }) {
  const current = plan.weeks[plan.current]?.phase
  const counts = PHASES.map((p) => [p, plan.weeks.filter((w) => w.phase === p).length] as const).filter(([, n]) => n > 0)
  const reached = (p: Phase) => PHASES.indexOf(p) <= PHASES.indexOf(current ?? 'base')
  return (
    <div aria-label={`Phase en cours : ${current ? PHASE_LABELS[current] : 'pas commencée'}`} role="img">
      <div className="flex gap-1">
        {counts.map(([p, n]) => (
          <div key={p} style={{ flex: n }} className={`h-2 rounded-full ${reached(p) ? 'bg-sport' : 'bg-fill-strong'}`} />
        ))}
      </div>
      <div className="mt-1.5 flex gap-1 text-[0.6875rem] font-semibold">
        {counts.map(([p, n]) => (
          <span key={p} style={{ flex: n }} className={`min-w-0 truncate ${p === current ? 'text-ink' : 'text-muted'}`}>
            {PHASE_LABELS[p]}
          </span>
        ))}
      </div>
    </div>
  )
}

interface Chip {
  key: string
  tone: Domain
  icon: IconName
  text: string
  /** Fait : un toucher ouvre la correction. Prévu aujourd'hui : un toucher le lance. */
  done: boolean
  to?: string
  onClick?: () => void
}

function ChipView({ c }: { c: Chip }) {
  const look = `tap inline-flex h-7 items-center gap-1.5 rounded-full pr-2.5 pl-2 t-footnote font-medium whitespace-nowrap ${
    c.done ? 'border border-line text-muted' : `${TONE.tint[c.tone]} text-ink`
  }`
  const body: ReactNode = (
    <>
      <Icon name={c.done ? 'check' : c.icon} className={TONE.text[c.tone]} />
      {c.text}
    </>
  )
  if (c.to)
    return (
      <Link to={c.to} className={look}>
        {body}
      </Link>
    )
  if (c.onClick)
    return (
      <button type="button" onClick={c.onClick} className={look}>
        {body}
      </button>
    )
  return <span className={look.replace('tap ', '')}>{body}</span>
}

/**
 * Semaine : le plan, ce qui est prévu jour par jour, plan marathon compris (REFONTE §7). Ce qui est fait se
 * corrige d'un toucher ; ce qui est prévu aujourd'hui se lance.
 */
export function WeekPage() {
  const { data, v1, today } = useAppData()
  const mk = useMarathon()
  const start = useStartPlanned()
  const monday = weekStart(today)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const goals = weekGoals(data, today)
  const plan = mk?.plan ?? null
  const planWeek = currentWeek(plan)
  const race = mk?.m.race.kind ?? 'marathon'
  const names = new Map(data.programs.map((p) => [p.id, p.name]))

  const chipsOf = (day: string): Chip[] => {
    const chips: Chip[] = []
    const sessions = v1.sessions.filter((s) => s.day === day).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    for (const s of sessions) {
      const run = runOf(s)
      const text =
        s.discipline === 'guitar'
          ? `Guitare ${s.durationMin} min`
          : run
            ? `Course ${km(run.km)}`
            : s.templateId === RUNNER_TEMPLATE_ID
              ? 'Renfo'
              : (names.get(s.templateId ?? '') ?? 'Sport')
      chips.push({ key: s.id, tone: s.discipline, icon: s.discipline, text, done: true, to: `/log/corriger/${s.id}` })
    }
    // Le prévu du plan, d'aujourd'hui à dimanche, tant qu'il n'est pas fait.
    if (planWeek && day >= today) {
      const ran = sessions.some((s) => runOf(s))
      const strong = sessions.some((s) => s.templateId === RUNNER_TEMPLATE_ID)
      for (const r of planWeek.runs.filter((x) => x.day === day && !ran))
        chips.push({
          key: `run-${r.kind}`,
          tone: 'sport',
          icon: 'sport',
          text: `${runLabel(r, race)}${r.km > 0 ? ` ${km(r.km)}` : ''}`,
          done: false,
          onClick: day === today && r.kind !== 'cross' ? () => start.run(r) : undefined,
        })
      for (const st of planWeek.strength.filter((x) => x.day === day && !strong))
        chips.push({
          key: 'renfo',
          tone: 'sport',
          icon: 'sport',
          text: `Renfo${st.light ? ' léger' : ''}`,
          done: false,
          onClick: day === today ? start.strength : undefined,
        })
    }
    return chips
  }

  return (
    <Screen
      title="Semaine"
      overline={`Semaine ${isoWeek(today)} · ${monday.slice(5, 7) === days[6].slice(5, 7) ? Number(monday.slice(8)) : shortDate(monday)} – ${shortDate(days[6])}`}
      pill={
        <Pill>
          {goals.guitar.done + goals.sport.done} / {goals.guitar.goal + goals.sport.goal} séances
        </Pill>
      }
    >
      <div className="flex flex-col gap-6">
        {mk && plan && planWeek ? (
          <Hero
            tone="sport"
            overline={`Sport · plan ${race === 'marathon' ? 'marathon' : 'semi'}`}
            aside={mk.daysLeft >= 0 ? `J-${mk.daysLeft}` : undefined}
            titleId="plan-title"
            title={planWeekLabel(plan)}
          >
            <PhaseBar plan={plan} />
            {plan.frozen && <p className="t-subhead rounded-lg bg-record/15 px-3 py-2">{plan.frozen}</p>}
            <div className="border-t border-line pt-3">
              <p className="t-footnote flex items-baseline justify-between gap-2">
                <span className="text-muted">Sport cette semaine</span>
                <span className="font-semibold tabular-nums">{planWeekProgress(planWeek, v1.sessions).text}</span>
              </p>
              <Gauge
                value={Math.round(planWeekProgress(planWeek, v1.sessions).ratio * 100)}
                max={100}
                color="sport"
                label="Kilomètres de la semaine"
                className="mt-2 h-1.5"
              />
            </div>
            <Link to="/marathon" className="hit tap t-subhead self-start font-semibold text-sport">
              Voir le plan
            </Link>
          </Hero>
        ) : (
          <Hero
            tone="accent"
            overline="Objectifs de la semaine"
            titleId="plan-title"
            title={`${goals.guitar.done + goals.sport.done} séances sur ${goals.guitar.goal + goals.sport.goal}`}
          >
            {(['guitar', 'sport'] as const).map((d) => (
              <div key={d}>
                <p className="t-footnote flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-muted">
                    <Icon name={d} className={TONE.text[d]} />
                    {d === 'guitar' ? 'Guitare · séances de 30 min' : 'Sport · séances'}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {goals[d].done} / {goals[d].goal}
                  </span>
                </p>
                <Gauge
                  value={goals[d].done}
                  max={goals[d].goal}
                  color={d}
                  label={d === 'guitar' ? 'Séances de guitare' : 'Séances de sport'}
                  className="mt-2 h-1.5"
                />
              </div>
            ))}
            {mk && !plan && (
              <Link to="/marathon" className="hit tap t-subhead self-start font-semibold text-sport">
                Plan marathon : voir les options
              </Link>
            )}
          </Hero>
        )}

        <section aria-labelledby="days-title">
          <SectionHeader id="days-title" title="Jour par jour" action={planWeek ? 'Recalculé chaque lundi' : undefined} />
          <ol className="rows overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            {days.map((day, i) => {
              const chips = chipsOf(day)
              const isToday = day === today
              return (
                <li
                  key={day}
                  aria-current={isToday ? 'date' : undefined}
                  className={`flex min-h-11.5 items-center gap-3 px-3 py-1.5 ${isToday ? 'bg-surface-2' : ''}`}
                >
                  <span className={`flex w-10 shrink-0 flex-col items-center ${isToday ? 'text-ink' : 'text-muted'}`}>
                    <span className="text-[0.6875rem] font-semibold tracking-[0.06em] uppercase">{WEEKDAYS[i]}</span>
                    <span className="t-title3 font-display font-bold">{Number(day.slice(8))}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                    {chips.length > 0 ? (
                      chips.map((c) => <ChipView key={c.key} c={c} />)
                    ) : (
                      <span className="t-footnote text-muted">{day < today ? 'Repos' : isToday ? "Rien d'enregistré" : '—'}</span>
                    )}
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      </div>
    </Screen>
  )
}
