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

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Guitare sur l'accueil, sur le modèle de la carte sport : la semaine, la séance du jour (exos, morceaux), le log. */
export function GuitarCard() {
  const { data, today } = useAppData()
  const { saveSong } = useActions()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)

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
      <div className="flex items-baseline justify-between">
        <h2 id="guitar-title" className="text-lg font-semibold">
          🎸 Guitare
        </h2>
        <p className="text-sm text-muted">
          {week.goalDays}/7 jours à {GUITAR_DAILY_MIN} min
        </p>
      </div>

      <ol className="grid grid-cols-7 gap-1.5" aria-label="Minutes de guitare de la semaine">
        {week.days.map((d, i) => {
          const full = d.minutes >= GUITAR_DAILY_MIN
          const isToday = d.day === today
          return (
            <li key={d.day} className="flex flex-col items-center gap-1" aria-label={`${DAY_LETTERS[i]} : ${d.minutes} min`}>
              <span className={`text-xs ${isToday ? 'font-bold text-ink' : 'text-muted'}`}>{DAY_LETTERS[i]}</span>
              <span
                className={`flex h-9 w-full items-center justify-center rounded-lg text-[11px] font-semibold tabular-nums ${
                  full
                    ? 'bg-guitar text-white'
                    : d.minutes > 0
                      ? `bg-guitar/25 text-ink ${isToday ? 'ring-2 ring-guitar' : ''}`
                      : isToday
                        ? 'border-2 border-guitar'
                        : 'bg-surface-2'
                }`}
              >
                {full ? '✓' : d.minutes > 0 ? d.minutes : ''}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="flex flex-col gap-1">
        <p className="font-medium">
          <span className="tabular-nums">
            {streak.todayMin}/{GUITAR_DAILY_MIN} min
          </span>{' '}
          · {goalMet ? 'Objectif du jour atteint ✓' : `Encore ${streak.remainingMin} min aujourd'hui`}
        </p>
        <Gauge value={streak.todayMin} max={GUITAR_DAILY_MIN} color="guitar" label="Minutes de guitare aujourd'hui" className="h-1.5" />
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
        <p className="text-sm text-muted">Séance du jour</p>
        <ul className="flex flex-col gap-2">
          {plan.map((ex) => {
            const best = bestBpm(data.guitarSessions, ex.id)
            const done = doneToday.has(ex.id)
            return (
              <li key={ex.id}>
                <Link to={`/exo/${ex.id}`} className={`flex flex-col gap-0.5 rounded-lg bg-surface px-3 py-2 ${done ? 'opacity-60' : ''}`}>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">
                      {done && '✓ '}
                      {ex.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {CATEGORY_LABELS[ex.category]} · niv. {ex.difficulty}
                    </span>
                  </span>
                  <span className="line-clamp-1 text-xs text-muted">{ex.description}</span>
                  <span className="text-sm tabular-nums">
                    Cible {ex.targetBpm} bpm{best !== null && <span className="text-muted"> · ton record {best} bpm</span>}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>

        {songs.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Morceaux en cours">
            {songs.map((s) => (
              <li key={s.id} className="rounded-full bg-surface px-3 py-1 text-sm">
                🎵 {s.title}
              </li>
            ))}
          </ul>
        )}
        {suggestion && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">Morceau suggéré</p>
              <p className="truncate font-medium">
                🎵 {suggestion.title} <span className="text-sm font-normal text-muted">· {suggestion.artist}</span>
              </p>
            </div>
            <button
              type="button"
              disabled={adding}
              aria-label={`Ajouter ${suggestion.title}`}
              className="shrink-0 font-semibold text-accent disabled:opacity-40"
              onClick={async () => {
                setAdding(true)
                try {
                  await saveSong({ id: crypto.randomUUID(), title: suggestion.title, status: 'learning', masteredOn: null })
                } finally {
                  setAdding(false)
                }
              }}
            >
              + Ajouter
            </button>
          </div>
        )}

        <Button
          className="mt-1"
          variant={goalMet ? 'secondary' : 'primary'}
          onClick={() => navigate('/log/guitare', goalMet ? undefined : { state: { durationMin: streak.remainingMin } })}
        >
          {goalMet ? 'Logger une session' : `Logger ${streak.remainingMin} min`}
        </Button>
      </div>
    </Card>
  )
}
