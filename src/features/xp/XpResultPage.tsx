import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { TONE } from '../../design/tone'
import { describeTarget, isChallengeMet } from '../../domain/challenges'
import { guitarMoment, sportMoment, WEEK_MILESTONES, type GoalMoment } from '../../domain/goalMoment'
import { XP_WEEK_GOAL } from '../../domain/levels'
import { useLevels } from '../levels/useLevels'
import { useRhythm } from '../week/useRhythm'
import type { Domain } from '../../domain/types'
import type { XpResult } from '../../domain/xp'
import { Fireworks, type FireworksSize } from '../../ui/Fireworks'
import { Gauge } from '../../ui/Gauge'

const LABEL: Record<Domain, string> = { guitar: 'Guitare', sport: 'Sport' }

/** Grands feux pour un palier de semaines réussies, petits pour un objectif atteint (semaine, séance comptée, défi). */
function fireworksFor(moment: GoalMoment | null, challengeMet: boolean, milestone: boolean): FireworksSize | null {
  switch (moment?.kind) {
    case 'weekDone':
      return milestone ? 'big' : 'small'
    case 'guitarCounted':
      return 'small'
    default:
      return challengeMet ? 'small' : null
  }
}

/** Où en sont les objectifs de la semaine après ce log : 5 séances de guitare, les séances de sport. */
function GoalBlock({ moment, weeks }: { moment: GoalMoment; weeks: number }) {
  switch (moment.kind) {
    case 'guitarRemaining':
      return (
        <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <p className="t-subhead font-semibold tabular-nums">{moment.todayMin}/30 min aujourd'hui</p>
          <Gauge
            from={moment.beforeMin}
            value={moment.todayMin}
            max={30}
            color="guitar"
            label={`Séance du jour : ${moment.todayMin} / 30 min`}
            className="mt-2 h-2.5"
          />
          <p className="t-subhead mt-2 text-muted">Encore {moment.remainingMin} min pour que la séance du jour compte</p>
        </div>
      )
    case 'guitarCounted':
      return (
        <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <p className="t-subhead flex items-center gap-1.5 font-semibold">
            <Icon name="check" className="text-guitar" />
            Séance comptée
          </p>
          <Gauge
            from={moment.done - 1}
            value={moment.done}
            max={moment.goal}
            color="guitar"
            label={`Guitare cette semaine : ${moment.done} / ${moment.goal}`}
            className="mt-2 h-2.5"
          />
          <p className="t-subhead mt-2 tabular-nums">
            {moment.done}/{moment.goal} cette semaine
          </p>
        </div>
      )
    case 'guitarBonus':
      return (
        <p className="t-subhead text-center text-muted">
          Séance du jour déjà comptée · {moment.done}/{moment.goal} cette semaine
        </p>
      )
    case 'weekDone':
      return (
        <div className="flex flex-col items-center text-center">
          <Icon name={WEEK_MILESTONES.includes(weeks) ? 'trophy' : moment.discipline} size="3.25em" className={TONE.text[moment.discipline]} />
          <p className="t-title2 mt-2">Objectif {moment.discipline === 'guitar' ? 'guitare' : 'sport'} de la semaine tenu</p>
          {weeks > 0 && <p className={`t-headline ${TONE.text[moment.discipline]}`}>Semaine réussie · {weeks} d'affilée</p>}
        </div>
      )
    case 'weekProgress':
      return (
        <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <Gauge
            from={moment.done - 1}
            value={moment.done}
            max={moment.goal}
            color="sport"
            label={`Séances de la semaine : ${moment.done} / ${moment.goal}`}
            className="h-2.5"
          />
          <p className="t-subhead mt-2 tabular-nums">
            {moment.done}/{moment.goal} cette semaine · {moment.remaining === 1 ? "plus qu'une" : `plus que ${moment.remaining}`}
          </p>
        </div>
      )
    case 'weekBonus':
      return <p className="t-subhead text-center text-muted">Séance bonus · {moment.done} cette semaine</p>
  }
}

export function XpResultPage() {
  // `notice` : une phrase en plus (ex. un nouveau chrono de référence après une sortie).
  const state = useLocation().state as {
    result: XpResult
    domain: Domain
    logId?: string
    edited?: boolean
    momentDay?: string
    notice?: string
    /** Course prévue à la fin de la muscu : on l'enchaîne. */
    thenRun?: object
  } | null
  const { data, today } = useAppData()
  const rhythm = useRhythm()
  const levels = useLevels()
  // Figé à l'arrivée : juste après le log, le défi est encore « actif » mais déjà atteint.
  const [met] = useState(() => data.challenges.filter((c) => c.status === 'active' && isChallengeMet(c, data)))
  // Figé aussi : la série ou la semaine que ce log vient de faire avancer. Une correction ne refête rien.
  // momentDay : jour de départ d'un chrono ou d'une séance commencés avant minuit. Le moment se juge sur ce
  // jour-là (série tenue, semaine validée), pas sur le lendemain où l'on a appuyé sur « Terminer ».
  const [moment] = useState(() =>
    !state?.edited && state?.logId
      ? state.domain === 'guitar'
        ? guitarMoment(data.guitarSessions, state.logId, state.momentDay ?? today)
        : sportMoment(data.sportSessions, state.logId, state.momentDay ?? today, rhythm.week.sport.goal)
      : null,
  )
  if (!state?.result) return <Navigate to="/" replace />

  const { domain } = state
  // Objectif de la semaine tenu par ce log : son bonus (calculé, pas stocké sur la séance) s'affiche avec le reste.
  const result: XpResult =
    moment?.kind === 'weekDone'
      ? { total: state.result.total + XP_WEEK_GOAL, lines: [...state.result.lines, { label: 'Objectif de la semaine tenu', xp: XP_WEEK_GOAL }] }
      : state.result
  const lvl = levels[domain]
  const fireworks = fireworksFor(moment, met.length > 0, WEEK_MILESTONES.includes(rhythm.streak.weeks))

  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      {fireworks && <Fireworks size={fireworks} />}
      {moment && (
        <section aria-label="Objectif" className="animate-pop">
          <GoalBlock moment={moment} weeks={rhythm.streak.weeks} />
        </section>
      )}
      <div className="animate-pop text-center">
        <p className="t-footnote font-semibold text-muted uppercase">{LABEL[domain]}</p>
        <p className={`t-display tabular-nums ${TONE.text[domain]}`}>+{result.total} XP</p>
      </div>
      {met.map((c) => (
        <div key={c.id} className={`animate-rise rounded-xl px-4 py-3 text-center ${TONE.tint[c.domain]}`}>
          <p className="t-headline flex items-center justify-center gap-1.5">
            <Icon name="target" />
            Défi réussi !
          </p>
          <p className="t-subhead text-ink">{describeTarget(c.target, data)}</p>
        </div>
      ))}
      {state.notice && (
        <p role="status" className="t-headline animate-rise text-center">
          {state.notice}
        </p>
      )}
      <ul className="rows animate-rise overflow-hidden rounded-md bg-surface" style={{ animationDelay: '80ms' }}>
        {result.lines.map((l) => (
          <li key={l.label} className="t-body flex min-h-11 items-center justify-between gap-3 px-4 py-2.5">
            <span>{l.label}</span>
            <span className={`font-semibold tabular-nums ${TONE.text[domain]}`}>+{l.xp}</span>
          </li>
        ))}
      </ul>
      <div className="animate-rise rounded-xl bg-surface p-4 shadow-card" style={{ animationDelay: '160ms' }}>
        <div className="t-subhead flex justify-between">
          <span className="font-semibold">
            {LABEL[domain]} · niveau {lvl.level}
          </span>
          <span className="text-muted tabular-nums">
            {lvl.xpInLevel} / {lvl.perLevel}
          </span>
        </div>
        <Gauge
          value={lvl.xpInLevel}
          from={Math.max(0, lvl.xpInLevel - result.total)}
          max={lvl.perLevel}
          color={domain}
          label={`${LABEL[domain]} : ${lvl.xpInLevel} / ${lvl.perLevel} XP`}
          className="mt-2.5 h-2.5"
        />
      </div>
      {state.thenRun ? (
        <>
          <Link to="/course" state={state.thenRun} className={`tap-scale t-headline mt-2 rounded-lg px-4 py-3.5 text-center ${TONE.solid[domain]}`}>
            Enchaîner la course
          </Link>
          <Link to="/" className={`hit tap t-subhead -mt-2 self-center py-2 ${TONE.text[domain]}`}>
            Pas de course aujourd'hui
          </Link>
        </>
      ) : (
        <Link to="/" className={`tap-scale t-headline mt-2 rounded-lg px-4 py-3.5 text-center ${TONE.solid[domain]}`}>
          Continuer
        </Link>
      )}
      <Link to={state.logId ? `/log/corriger/${state.logId}` : '/log/corriger'} className={`hit tap t-subhead -mt-2 self-center py-2 ${TONE.text[domain]}`}>
        Une erreur ? Corriger ce log
      </Link>
    </div>
  )
}
