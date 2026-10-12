import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CATEGORY_LABELS } from '../../content/exercises'
import { useActions, useAppData } from '../../data/AppDataContext'
import { dailyPlan } from '../../domain/dailyPlan'
import { guitarWeek } from '../../domain/guitarWeek'
import { bestBpm } from '../../domain/records'
import { songOfTheDay } from '../../domain/songSuggestion'
import { GUITAR_DAILY_MIN, guitarStreak } from '../../domain/streak'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Gauge } from '../../ui/Gauge'
import { WeekStrip } from '../../ui/WeekStrip'

function Chevron() {
  return (
    <svg width="8" height="13" viewBox="0 0 8 13" className="shrink-0 self-center text-faint" aria-hidden>
      <path d="M1.5 1.5 6.5 6.5 1.5 11.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Guitare sur l'accueil : la semaine, l'objectif du jour, la séance du jour (exos, morceaux), le log. */
export function GuitarCard() {
  const { data, today } = useAppData()
  const { saveSong } = useActions()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const week = guitarWeek(data.guitarSessions, today)
  const streak = guitarStreak(data.guitarSessions, today)
  const plan = dailyPlan(data, today)
  const suggestion = songOfTheDay(data.songs, today)
  const songs = data.songs.filter((s) => s.status === 'learning').sort((a, b) => a.title.localeCompare(b.title, 'fr'))
  const doneToday = new Set(
    data.guitarSessions.filter((s) => s.day === today).flatMap((s) => s.items.flatMap((it) => (it.kind === 'exercise' ? [it.exerciseId] : []))),
  )
  const goalMet = streak.remainingMin === 0

  return (
    <Card className="flex flex-col gap-4" role="region" aria-labelledby="guitar-title">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="guitar-title" className="t-title3">
          🎸 Guitare
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
          fill: d.minutes >= GUITAR_DAILY_MIN ? 1 : d.minutes > 0 ? 0.5 : 0,
          content: d.minutes >= GUITAR_DAILY_MIN ? '✓' : d.minutes > 0 ? d.minutes : '',
          label: `${d.minutes} min`,
        }))}
      />

      <div className="flex flex-col gap-2">
        <p className="t-subhead">
          <span className="font-semibold tabular-nums">
            {streak.todayMin}/{GUITAR_DAILY_MIN} min
          </span>{' '}
          <span className="text-muted">· {goalMet ? 'Objectif du jour atteint ✓' : `Encore ${streak.remainingMin} min aujourd'hui`}</span>
        </p>
        <Gauge value={streak.todayMin} max={GUITAR_DAILY_MIN} color="guitar" label="Minutes de guitare aujourd'hui" className="h-1.5" />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="t-footnote font-semibold text-muted uppercase">Séance du jour</h3>
        <ul className="rows -mx-1 overflow-hidden rounded-[0.875rem] bg-surface-2 dark:bg-fill">
          {plan.map((ex) => {
            const best = bestBpm(data.guitarSessions, ex.id)
            const done = doneToday.has(ex.id)
            return (
              <li key={ex.id}>
                <Link to={`/exo/${ex.id}`} className={`tap-row flex gap-3 px-3.5 py-3 ${done ? 'opacity-55' : ''}`}>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="t-headline truncate">
                        {done && '✓ '}
                        {ex.title}
                      </span>
                      <span className="t-caption shrink-0 text-muted">
                        {CATEGORY_LABELS[ex.category]} · niv. {ex.difficulty}
                      </span>
                    </span>
                    <span className="t-footnote line-clamp-1 text-muted">{ex.description}</span>
                    <span className="t-subhead text-guitar tabular-nums">
                      Cible {ex.targetBpm} bpm{best !== null && <span className="text-muted"> · ton record {best} bpm</span>}
                    </span>
                  </span>
                  <Chevron />
                </Link>
              </li>
            )
          })}
        </ul>

        {songs.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Morceaux en cours">
            {songs.map((s) => (
              <li key={s.id} className="t-footnote rounded-full bg-fill px-3 py-1.5">
                🎵 {s.title}
              </li>
            ))}
          </ul>
        )}
        {suggestion && (
          <div className="flex items-center gap-3 rounded-[0.875rem] border border-dashed border-line px-3.5 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="t-caption text-muted">Morceau suggéré</p>
              <p className="t-subhead truncate font-semibold">
                🎵 {suggestion.title} <span className="font-normal text-muted">· {suggestion.artist}</span>
              </p>
            </div>
            <button
              type="button"
              disabled={adding}
              aria-label={`Ajouter ${suggestion.title}`}
              className="tap-scale t-subhead shrink-0 rounded-full bg-accent/12 px-3.5 py-1.5 font-semibold text-accent disabled:opacity-35"
              onClick={async () => {
                setAdding(true)
                setAddError(null)
                try {
                  await saveSong({ id: crypto.randomUUID(), title: suggestion.title, status: 'learning', masteredOn: null })
                } catch (e) {
                  setAddError(e instanceof Error ? e.message : 'Ajout impossible')
                } finally {
                  setAdding(false)
                }
              }}
            >
              Ajouter
            </button>
          </div>
        )}
        {addError && (
          <p role="alert" className="t-footnote text-danger">
            {addError}
          </p>
        )}
      </div>

      <Button
        variant={goalMet ? 'secondary' : 'primary'}
        onClick={() => navigate('/log/guitare', goalMet ? undefined : { state: { durationMin: streak.remainingMin } })}
      >
        {goalMet ? 'Logger une session' : `Logger ${streak.remainingMin} min`}
      </Button>
    </Card>
  )
}
