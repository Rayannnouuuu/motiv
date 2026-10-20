import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { TONE } from '../../design/tone'
import { upcomingPrograms } from '../../domain/progression'
import { SPORT_WEEKLY_SESSIONS, sportStreak } from '../../domain/streak'
import { sportWeek } from '../../domain/sportWeek'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Gauge } from '../../ui/Gauge'
import { WeekStrip } from '../../ui/WeekStrip'
import { activeExercises, formatWeight, loadLive, prefillFor, resolveIndex, tracking } from '../log-sport/liveSession'

/** Sport sur l'accueil : la semaine, la séance du jour avec ses exos (ou celle en cours), la suivante. */
export function SportCard() {
  const { data, v1, today } = useAppData()
  const navigate = useNavigate()
  const week = sportWeek(data.sportSessions, today)
  const streak = sportStreak(data.sportSessions, today)
  const [next, after] = upcomingPrograms(data.programs, data.sportSessions, 2)
  const live = loadLive()
  const liveProgram = live && data.programs.find((p) => p.id === live.programId)
  const liveExercises = activeExercises(liveProgram ?? undefined)
  const liveIndex = live ? resolveIndex(live, liveExercises) : -1
  const doneToday = week.days.find((d) => d.day === today)!.sessions.length > 0
  const names = new Map(data.programs.map((p) => [p.id, p.name]))
  const track = useMemo(() => tracking(v1), [v1])

  return (
    <Card className="flex flex-col gap-4" role="region" aria-labelledby="sport-title">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="sport-title" className="t-title3 flex items-center gap-2">
          <Icon name="sport" className="text-sport" />
          Sport
        </h2>
        <p className="t-footnote text-muted">{streak.weeks > 0 ? `${streak.weeks} sem. d'affilée` : 'Cette semaine'}</p>
      </div>

      <WeekStrip
        label="Séances de la semaine"
        color="sport"
        today={today}
        days={week.days.map((d) => ({
          day: d.day,
          fill: d.sessions.length > 0 ? 1 : 0,
          content: d.sessions.length > 0 ? <Icon name="check" size="1.45em" /> : '',
          label: d.sessions.map((s) => names.get(s.programId) ?? 'Séance').join(', ') || (d.day < today ? 'pas de sport' : ''),
          missed: d.sessions.length === 0 && d.day < today,
        }))}
      />

      <div className="flex flex-col gap-2">
        <p className="t-subhead">
          <span className="font-semibold tabular-nums">
            {week.done}/{SPORT_WEEKLY_SESSIONS}
          </span>{' '}
          <span className="text-muted">
            ·{' '}
            {week.remaining === 0 ? (
              <>
                Semaine validée <Icon name="check" className="text-sport" />
              </>
            ) : (
              `Encore ${week.remaining} séance${week.remaining > 1 ? 's' : ''} cette semaine`
            )}
          </span>
        </p>
        <Gauge value={week.done} max={SPORT_WEEKLY_SESSIONS} color="sport" label="Séances de sport cette semaine" className="h-1.5" />
      </div>

      {live && liveProgram ? (
        <div className="flex flex-col gap-3 rounded-lg bg-sport/10 p-3.5 ring-1 ring-sport/40">
          <div>
            <p className="t-footnote flex items-center gap-1.5 font-semibold text-sport">
              <span className="h-2 w-2 animate-pulse rounded-full bg-sport motion-reduce:animate-none" aria-hidden />
              Séance en cours
            </p>
            <p className="t-title3">{liveProgram.name}</p>
          </div>
          <ul className="t-subhead flex flex-col gap-1.5" aria-label="Exos de la séance en cours">
            {liveExercises.map((e, i) => {
              const done = live.sets.filter((x) => x.programExerciseId === e.id).length
              const isCurrent = i === liveIndex
              return (
                <li key={e.id} className={`flex justify-between gap-2 ${isCurrent ? 'font-semibold' : ''} ${i < liveIndex ? 'text-muted' : ''}`}>
                  <span className="flex min-w-0 items-center gap-1">
                    {isCurrent ? <Icon name="chevron" className="text-sport" /> : done >= e.targetSets && <Icon name="check" className="text-sport" />}
                    {e.name}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {done}/{e.targetSets} séries
                  </span>
                </li>
              )
            })}
          </ul>
          <Button tone="sport" onClick={() => navigate('/log/sport')}>
            <Icon name="timer" />
            Reprendre la séance
          </Button>
        </div>
      ) : next ? (
        <div className="flex flex-col gap-2">
          <h3 className="t-footnote font-semibold text-muted uppercase">{doneToday ? 'Prochaine séance' : 'Séance du jour'}</h3>
          <div className="rounded-lg bg-inset px-3.5 py-3">
            <p className="t-headline pb-1.5">{next.name}</p>
            <ul className="t-subhead flex flex-col gap-1">
              {activeExercises(next).map((e) => {
                // Charge proposée (suit le mouvement).
                const p = prefillFor(e, track)
                return (
                  <li key={e.id} className="flex justify-between gap-2">
                    <span className="truncate">{e.name}</span>
                    <span className="shrink-0 text-muted tabular-nums">
                      {e.targetSets}×{e.targetReps}
                      {p.known && ` · ${formatWeight(p.weightKg)}`}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
          {after && after.id !== next.id && <p className="t-footnote px-1 text-muted">Ensuite : {after.name}</p>}
          <Button className="mt-1" variant="secondary" tone="sport" onClick={() => navigate('/log/sport', { state: { programId: next.id } })}>
            <Icon name="play" />
            Commencer {next.name}
          </Button>
        </div>
      ) : (
        <Link to="/bibliotheque?vue=modeles" className={`tap-scale t-headline rounded-lg px-4 py-3.5 text-center ${TONE.tint.sport}`}>
          Choisir ton programme
        </Link>
      )}
    </Card>
  )
}
