import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { upcomingPrograms } from '../../domain/progression'
import { SPORT_WEEKLY_SESSIONS, sportStreak } from '../../domain/streak'
import { sportWeek } from '../../domain/sportWeek'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { activeExercises, formatWeight, loadLive, prefillFor } from '../log-sport/liveSession'

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Sport sur l'accueil : la semaine, la séance du jour avec ses exos, la suivante. */
export function SportCard() {
  const { data, today } = useAppData()
  const navigate = useNavigate()
  const week = sportWeek(data.sportSessions, today)
  const streak = sportStreak(data.sportSessions, today)
  const [next, after] = upcomingPrograms(data.programs, data.sportSessions, 2)
  const live = loadLive()
  const liveProgram = live && data.programs.find((p) => p.id === live.programId)
  const doneToday = week.days.find((d) => d.day === today)!.sessions.length > 0
  const names = new Map(data.programs.map((p) => [p.id, p.name]))

  return (
    <Card className="flex flex-col gap-4" aria-labelledby="sport-title">
      <div className="flex items-baseline justify-between">
        <h2 id="sport-title" className="text-lg font-semibold">
          🏋️ Sport
        </h2>
        <p className="text-sm text-muted">
          {streak.weeks > 0 ? `${streak.weeks} sem. d'affilée` : 'Cette semaine'}
        </p>
      </div>

      <ol className="grid grid-cols-7 gap-1.5" aria-label="Séances de la semaine">
        {week.days.map((d, i) => {
          const has = d.sessions.length > 0
          const isToday = d.day === today
          const label = d.sessions.map((s) => names.get(s.programId) ?? 'Séance').join(', ')
          return (
            <li key={d.day} className="flex flex-col items-center gap-1" aria-label={`${DAY_LETTERS[i]}${has ? ` : ${label}` : ''}`}>
              <span className={`text-xs ${isToday ? 'font-bold text-ink' : 'text-muted'}`}>{DAY_LETTERS[i]}</span>
              <span
                className={`flex h-9 w-full items-center justify-center rounded-lg text-xs font-semibold ${
                  has ? 'bg-sport text-white' : isToday ? 'border-2 border-sport' : 'bg-surface-2'
                }`}
              >
                {has ? '✓' : ''}
              </span>
            </li>
          )
        })}
      </ol>

      <p className="font-medium">
        <span className="tabular-nums">
          {week.done}/{SPORT_WEEKLY_SESSIONS}
        </span>{' '}
        ·{' '}
        {week.remaining === 0
          ? 'Semaine validée ✓'
          : `Encore ${week.remaining} séance${week.remaining > 1 ? 's' : ''} cette semaine`}
      </p>

      {live && liveProgram ? (
        <Button onClick={() => navigate('/log/sport')}>Reprendre la séance {liveProgram.name}</Button>
      ) : next ? (
        <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
          <p className="text-sm text-muted">{doneToday ? 'Prochaine séance' : 'Séance du jour'}</p>
          <p className="text-lg font-semibold">{next.name}</p>
          <ul className="flex flex-col gap-1 text-sm">
            {activeExercises(next).map((e) => {
              const p = prefillFor(e, data.sportSessions)
              return (
                <li key={e.id} className="flex justify-between gap-2">
                  <span>{e.name}</span>
                  <span className="shrink-0 text-muted tabular-nums">
                    {e.targetSets}×{e.targetReps}
                    {p.summary && ` · ${formatWeight(p.weightKg)}`}
                  </span>
                </li>
              )
            })}
          </ul>
          <Button className="mt-1" variant={doneToday ? 'secondary' : 'primary'} onClick={() => navigate('/log/sport')}>
            Commencer {next.name}
          </Button>
          {after && after.id !== next.id && <p className="text-xs text-muted">Ensuite : {after.name}</p>}
        </div>
      ) : (
        <Link to="/reglages" className="rounded-xl border border-accent px-4 py-3 text-center font-semibold text-accent">
          Choisir ton programme
        </Link>
      )}
    </Card>
  )
}
