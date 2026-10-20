import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { dailyPlan } from '../../domain/dailyPlan'
import { songsOfTheDay } from '../../domain/songSuggestion'
import { guitarWeek } from '../../domain/guitarWeek'
import { bestBpm } from '../../domain/records'
import { GUITAR_DAILY_MIN, GUITAR_SHORT_MIN, guitarStreak } from '../../domain/streak'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { RowChevron } from '../../ui/List'
import { WeekStrip } from '../../ui/WeekStrip'
import { loadLive } from '../log-sport/liveSession'
import { runningPracticeMinutes } from '../practice/practiceSession'

/** Guitare sur l'accueil : la semaine, la séance du jour (exos, morceaux), le log sans chrono. */
export function GuitarCard() {
  const { data, today } = useAppData()
  const navigate = useNavigate()

  const week = guitarWeek(data.guitarSessions, today)
  const streak = guitarStreak(data.guitarSessions, today)
  const plan = dailyPlan(data, today)
  // Deux morceaux par jour : un en cours, un nouveau. Les toucher ouvre le log avec le morceau.
  const songs = songsOfTheDay(data.songs, data.guitarSessions, today)
  const doneToday = new Set(
    data.guitarSessions.filter((s) => s.day === today).flatMap((s) => s.items.flatMap((it) => (it.kind === 'exercise' ? [it.exerciseId] : []))),
  )
  const goalMet = streak.remainingMin === 0
  const practiceRunning = runningPracticeMinutes() !== null
  // Le bouton du haut de l'accueil propose déjà la guitare sauf si une séance sport est en cours ou que
  // l'objectif est atteint : dans ces cas, le chrono doit rester accessible ici.
  const heroIsGuitar = loadLive() === null && (practiceRunning || !goalMet)

  return (
    <Card className="flex flex-col gap-4" role="region" aria-labelledby="guitar-title">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="guitar-title" className="t-title3 flex items-center gap-2">
          <Icon name="guitar" className="text-guitar" />
          Guitare
        </h2>
        <p className="t-footnote text-muted">
          {week.goalDays}/7 jours à {GUITAR_DAILY_MIN} min
        </p>
      </div>

      <WeekStrip
        label="Minutes de guitare de la semaine"
        color="guitar"
        today={today}
        days={week.days.map((d) => ({
          day: d.day,
          // Plein à 60 min, à moitié pour un jour court (30 à 59 min, il compte), vide en dessous.
          fill: d.minutes >= GUITAR_DAILY_MIN ? 1 : d.minutes >= GUITAR_SHORT_MIN ? 0.5 : 0,
          content: d.minutes >= GUITAR_DAILY_MIN ? <Icon name="check" size="1.45em" /> : d.minutes > 0 ? d.minutes : '',
          label: `${d.minutes} min`,
        }))}
      />

      <div className="flex flex-col gap-2">
        <h3 className="t-footnote font-semibold text-muted uppercase">Séance du jour</h3>
        <ul className="rows -mx-1 overflow-hidden rounded-lg bg-inset">
          {plan.map((ex) => {
            const best = bestBpm(data.guitarSessions, ex.id)
            const done = doneToday.has(ex.id)
            return (
              <li key={ex.id}>
                <Link to={`/exo/${ex.id}`} className={`tap-row flex gap-3 px-3.5 py-2.5 ${done ? 'opacity-55' : ''}`}>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="t-headline flex min-w-0 items-center gap-1">
                        {done && <Icon name="check" className="text-guitar" />}
                        <span className="truncate">{ex.title}</span>
                      </span>
                      <span className="t-caption shrink-0 text-muted">niv. {ex.difficulty}</span>
                    </span>
                    <span className="t-subhead text-guitar tabular-nums">
                      Cible {ex.targetBpm} bpm{best !== null && <span className="text-muted"> · ton record {best} bpm</span>}
                    </span>
                  </span>
                  <RowChevron className="self-center" />
                </Link>
              </li>
            )
          })}
        </ul>
        {songs.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Morceaux à jouer aujourd'hui">
            {songs.map((title) => (
              <li key={title}>
                <button
                  type="button"
                  className="hit tap-scale t-footnote flex items-center gap-1 rounded-full bg-guitar/12 px-3 py-1.5 font-medium text-guitar"
                  onClick={() => navigate('/log/guitare', { state: { songTitle: title } })}
                >
                  <Icon name="song" />
                  {title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {!heroIsGuitar && (
          <Button variant="secondary" tone="guitar" onClick={() => navigate('/jouer', practiceRunning ? undefined : { state: { autostart: true } })}>
            <Icon name={practiceRunning ? 'timer' : 'play'} />
            {practiceRunning ? 'Reprendre le chrono' : goalMet ? 'Rejouer avec le chrono' : 'Jouer avec le chrono'}
          </Button>
        )}
        <Button
          variant="ghost"
          tone="guitar"
          // Chrono en cours : ses minutes seront comptées à sa fin, rien à présélectionner ici.
          onClick={() => navigate('/log/guitare', streak.remainingMin > 0 && !practiceRunning ? { state: { durationMin: streak.remainingMin } } : undefined)}
        >
          Logger sans chrono
        </Button>
      </div>
    </Card>
  )
}
