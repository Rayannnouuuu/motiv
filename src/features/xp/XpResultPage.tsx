import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { TONE } from '../../design/tone'
import { describeTarget, isChallengeMet } from '../../domain/challenges'
import { guitarMoment, sportMoment, type GoalMoment } from '../../domain/goalMoment'
import { allLevels } from '../../domain/levels'
import { SPORT_WEEKLY_SESSIONS } from '../../domain/streak'
import type { Domain } from '../../domain/types'
import type { XpResult } from '../../domain/xp'
import { Fireworks, type FireworksSize } from '../../ui/Fireworks'
import { Gauge } from '../../ui/Gauge'

const LABEL: Record<Domain, string> = { guitar: 'Guitare', sport: 'Sport' }

const jours = (n: number) => `${n} jour${n > 1 ? 's' : ''}`

/** Grands feux pour un palier, petits pour un objectif atteint (série, semaine, défi). Un simple log : le +XP et la jauge suffisent. */
function fireworksFor(moment: GoalMoment | null, challengeMet: boolean): FireworksSize | null {
  switch (moment?.kind) {
    case 'streakKept':
    case 'streakRepaired':
    case 'weekDone':
      return moment.milestone ? 'big' : 'small'
    default:
      return challengeMet ? 'small' : null
  }
}

/** Où en sont les deux vrais objectifs après ce log : la série guitare et la semaine de sport (3 séances). */
function GoalBlock({ moment }: { moment: GoalMoment }) {
  switch (moment.kind) {
    case 'streakKept':
    case 'streakRepaired': {
      const what = moment.kind === 'streakKept' ? 'Série tenue' : 'Série réparée'
      return (
        <div className="flex flex-col items-center text-center">
          <Icon name={moment.milestone ? 'trophy' : 'guitar'} size="3.25em" className="text-guitar" />
          <p className="t-title1 mt-2 tabular-nums">{jours(moment.days)}</p>
          <p className="t-headline text-guitar">
            {moment.milestone ? `${what} · palier de ${moment.days} jours` : moment.kind === 'streakKept' ? 'Série tenue !' : 'Série réparée'}
          </p>
        </div>
      )
    }
    case 'guitarRemaining':
      return (
        <div className="rounded-xl bg-surface p-4 shadow-card">
          <p className="t-subhead font-semibold tabular-nums">
            {moment.todayMin}/{moment.targetMin} min aujourd'hui
          </p>
          <Gauge
            from={moment.beforeMin}
            value={moment.todayMin}
            max={moment.targetMin}
            color="guitar"
            label={`Objectif du jour : ${moment.todayMin} / ${moment.targetMin} min`}
            className="mt-2.5 h-2.5"
          />
          <p className="t-subhead mt-2 text-muted">
            {moment.days > 0
              ? `Encore ${moment.remainingMin} min pour garder ta série de ${jours(moment.days)}`
              : `Encore ${moment.remainingMin} min pour lancer ta série`}
          </p>
        </div>
      )
    case 'guitarBonus':
      return <p className="t-subhead text-center text-muted">Série déjà tenue aujourd'hui · {jours(moment.days)}</p>
    case 'weekDone':
      return (
        <div className="flex flex-col items-center text-center">
          <Icon name={moment.milestone ? 'trophy' : 'sport'} size="3.25em" className="text-sport" />
          <p className="t-title2 mt-2">Semaine validée</p>
          <p className="t-headline text-sport">
            {moment.weeks === 1 ? (moment.firstEver ? 'Première semaine validée' : "C'est reparti · 1 semaine d'affilée") : `${moment.weeks} semaines d'affilée`}
          </p>
        </div>
      )
    case 'weekProgress':
      return (
        <div className="rounded-xl bg-surface p-4 shadow-card">
          <Gauge
            from={moment.done - 1}
            value={moment.done}
            max={SPORT_WEEKLY_SESSIONS}
            color="sport"
            label={`Séances de la semaine : ${moment.done} / ${SPORT_WEEKLY_SESSIONS}`}
            className="h-2.5"
          />
          <p className="t-subhead mt-2 tabular-nums">
            {moment.done}/{SPORT_WEEKLY_SESSIONS} cette semaine · {moment.remaining === 1 ? "plus qu'une" : `plus que ${moment.remaining}`}
          </p>
        </div>
      )
    case 'weekBonus':
      return <p className="t-subhead text-center text-muted">Séance bonus · {moment.done} cette semaine</p>
  }
}

export function XpResultPage() {
  const state = useLocation().state as { result: XpResult; domain: Domain; logId?: string; edited?: boolean; momentDay?: string } | null
  const { data, today } = useAppData()
  // Figé à l'arrivée : juste après le log, le défi est encore « actif » mais déjà atteint.
  const [met] = useState(() => data.challenges.filter((c) => c.status === 'active' && isChallengeMet(c, data)))
  // Figé aussi : la série ou la semaine que ce log vient de faire avancer. Une correction ne refête rien.
  // momentDay : jour de départ d'un chrono ou d'une séance commencés avant minuit. Le moment se juge sur ce
  // jour-là (série tenue, semaine validée), pas sur le lendemain où l'on a appuyé sur « Terminer ».
  const [moment] = useState(() =>
    !state?.edited && state?.logId
      ? state.domain === 'guitar'
        ? guitarMoment(data.guitarSessions, state.logId, state.momentDay ?? today)
        : sportMoment(data.sportSessions, state.logId, state.momentDay ?? today)
      : null,
  )
  if (!state?.result) return <Navigate to="/" replace />

  const { result, domain } = state
  const lvl = allLevels(data)[domain]
  const fireworks = fireworksFor(moment, met.length > 0)

  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      {fireworks && <Fireworks size={fireworks} />}
      {moment && (
        <section aria-label="Objectif" className="animate-pop">
          <GoalBlock moment={moment} />
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
        {lvl.blocked && <p className={`t-subhead mt-2 font-semibold ${TONE.text[domain]}`}>Défi requis pour passer au niveau suivant</p>}
      </div>
      <Link to="/" className={`tap-scale t-headline mt-2 rounded-lg px-4 py-3.5 text-center ${TONE.solid[domain]}`}>
        Continuer
      </Link>
      <Link to={state.logId ? `/log/corriger/${state.logId}` : '/log/corriger'} className={`hit tap t-subhead -mt-2 self-center py-2 ${TONE.text[domain]}`}>
        Une erreur ? Corriger ce log
      </Link>
    </div>
  )
}
