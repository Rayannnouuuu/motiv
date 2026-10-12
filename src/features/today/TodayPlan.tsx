import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORY_LABELS } from '../../content/exercises'
import { useActions, useAppData } from '../../data/AppDataContext'
import { songOfTheDay } from '../../domain/songSuggestion'
import { dailyPlan } from '../../domain/dailyPlan'
import { bestBpm } from '../../domain/records'
import { Card } from '../../ui/Card'

/** Exos proposés aujourd'hui (avec détails) et morceaux en cours (nom seul). */
export function TodayPlan() {
  const { data, today } = useAppData()
  const { saveSong } = useActions()
  const [adding, setAdding] = useState(false)
  const suggestion = songOfTheDay(data.songs, today)
  const plan = dailyPlan(data, today)
  const doneToday = new Set(
    data.guitarSessions.filter((s) => s.day === today).flatMap((s) => s.items.flatMap((it) => (it.kind === 'exercise' ? [it.exerciseId] : []))),
  )
  const songs = data.songs.filter((s) => s.status === 'learning').sort((a, b) => a.title.localeCompare(b.title, 'fr'))

  return (
    <section className="flex flex-col gap-2" aria-labelledby="plan-title">
      <h2 id="plan-title" className="text-lg font-semibold">
        À travailler aujourd'hui
      </h2>
      {plan.map((ex) => {
        const best = bestBpm(data.guitarSessions, ex.id)
        const done = doneToday.has(ex.id)
        return (
          <Link key={ex.id} to={`/exo/${ex.id}`} className="block">
            <Card className={`flex flex-col gap-1 ${done ? 'opacity-60' : ''}`}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold">
                  {done && '✓ '}
                  {ex.title}
                </p>
                <p className="shrink-0 text-xs text-muted">
                  {CATEGORY_LABELS[ex.category]} · niv. {ex.difficulty}/10
                </p>
              </div>
              <p className="line-clamp-2 text-sm text-muted">{ex.description}</p>
              <p className="text-sm tabular-nums">
                Cible {ex.targetBpm} bpm{best !== null && <span className="text-muted"> · ton record {best} bpm</span>}
              </p>
            </Card>
          </Link>
        )
      })}
      {songs.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Morceaux en cours">
          {songs.map((s) => (
            <li key={s.id} className="rounded-full bg-surface-2 px-3 py-1 text-sm">
              🎵 {s.title}
            </li>
          ))}
        </ul>
      )}
      {suggestion && (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2">
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
    </section>
  )
}
