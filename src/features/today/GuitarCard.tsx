import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useActions, useAppData } from '../../data/AppDataContext'
import { dailyPlan } from '../../domain/dailyPlan'
import { guitarWeek } from '../../domain/guitarWeek'
import { bestBpm } from '../../domain/records'
import { songOfTheDay } from '../../domain/songSuggestion'
import { GUITAR_DAILY_MIN, GUITAR_SHORT_MIN, guitarStreak } from '../../domain/streak'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { WeekStrip } from '../../ui/WeekStrip'
import { loadLive } from '../log-sport/liveSession'
import { runningPracticeMinutes } from '../practice/practiceSession'

function Chevron() {
  return (
    <svg width="8" height="13" viewBox="0 0 8 13" className="shrink-0 self-center text-faint" aria-hidden>
      <path d="M1.5 1.5 6.5 6.5 1.5 11.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Guitare sur l'accueil : la semaine, la séance du jour (exos, morceaux), le log sans chrono. */
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
  const practiceRunning = runningPracticeMinutes() !== null
  // Le bouton du haut de l'accueil propose déjà la guitare sauf si une séance sport est en cours ou que
  // l'objectif est atteint : dans ces cas, le chrono doit rester accessible ici.
  const heroIsGuitar = loadLive() === null && (practiceRunning || !goalMet)

  async function addSuggestion(title: string) {
    setAdding(true)
    setAddError(null)
    try {
      await saveSong({ id: crypto.randomUUID(), title, status: 'learning', masteredOn: null })
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Ajout impossible')
    } finally {
      setAdding(false)
    }
  }

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
          // Plein à 60 min, à moitié pour un jour court (30 à 59 min, il compte), vide en dessous.
          fill: d.minutes >= GUITAR_DAILY_MIN ? 1 : d.minutes >= GUITAR_SHORT_MIN ? 0.5 : 0,
          content: d.minutes >= GUITAR_DAILY_MIN ? '✓' : d.minutes > 0 ? d.minutes : '',
          label: `${d.minutes} min`,
        }))}
      />

      <div className="flex flex-col gap-2">
        <h3 className="t-footnote font-semibold text-muted uppercase">Séance du jour</h3>
        <ul className="rows -mx-1 overflow-hidden rounded-[0.875rem] bg-surface-2 dark:bg-fill">
          {plan.map((ex) => {
            const best = bestBpm(data.guitarSessions, ex.id)
            const done = doneToday.has(ex.id)
            return (
              <li key={ex.id}>
                <Link to={`/exo/${ex.id}`} className={`tap-row flex gap-3 px-3.5 py-2.5 ${done ? 'opacity-55' : ''}`}>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="t-headline truncate">
                        {done && '✓ '}
                        {ex.title}
                      </span>
                      <span className="t-caption shrink-0 text-muted">niv. {ex.difficulty}</span>
                    </span>
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

        {(songs.length > 0 || suggestion) && (
          <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Morceaux en cours">
            {songs.map((s) => (
              <li key={s.id} className="t-footnote rounded-full bg-fill px-3 py-1.5">
                🎵 {s.title}
              </li>
            ))}
            {suggestion && (
              <li>
                <button
                  type="button"
                  disabled={adding}
                  aria-label={`Ajouter ${suggestion.title}`}
                  className="tap-scale t-footnote rounded-full border border-dashed border-faint px-3 py-[0.3125rem] text-accent disabled:opacity-35"
                  onClick={() => addSuggestion(suggestion.title)}
                >
                  + {suggestion.title}
                </button>
              </li>
            )}
          </ul>
        )}
        {addError && (
          <p role="alert" className="t-footnote text-danger">
            {addError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {!heroIsGuitar && (
          <Button variant="secondary" onClick={() => navigate('/jouer', practiceRunning ? undefined : { state: { autostart: true } })}>
            {practiceRunning ? '⏱ Reprendre le chrono' : goalMet ? '▶︎ Rejouer avec le chrono' : '▶︎ Jouer avec le chrono'}
          </Button>
        )}
        <Button
          variant="ghost"
          // Chrono en cours : ses minutes seront comptées à sa fin, rien à présélectionner ici.
          onClick={() => navigate('/log/guitare', streak.remainingMin > 0 && !practiceRunning ? { state: { durationMin: streak.remainingMin } } : undefined)}
        >
          Logger sans chrono
        </Button>
      </div>
    </Card>
  )
}
