import { useState } from 'react'
import { EXERCISES, getExercise } from '../../content/exercises'
import { bestBpm } from '../../domain/records'
import type { GuitarSession, Song } from '../../domain/types'

export type Entry = { kind: 'exercise'; exerciseId: string; bpm: string } | { kind: 'song'; songId: string; mastered: boolean }

const MAX_RESULTS = 8

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

/** Ids d'exos connus, du plus récent au plus ancien. */
function recentExerciseIds(sessions: GuitarSession[]): string[] {
  const ids: string[] = []
  for (const s of [...sessions].sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt)))
    for (const it of s.items)
      if (it.kind === 'exercise' && !ids.includes(it.exerciseId) && getExercise(it.exerciseId)) ids.push(it.exerciseId)
  return ids
}

type Result = { key: string; label: string; add: () => void }

export function StepContent({ entries, songs, sessions, onEntries, onCreateSong }: {
  entries: Entry[]
  songs: Song[]
  sessions: GuitarSession[]
  onEntries: (e: Entry[]) => void
  onCreateSong: (title: string) => void
}) {
  const [query, setQuery] = useState('')
  const q = norm(query)

  const add = (e: Entry) => {
    onEntries([...entries, e])
    setQuery('')
  }
  const update = (i: number, e: Entry) => onEntries(entries.map((x, j) => (j === i ? e : x)))
  const remove = (i: number) => onEntries(entries.filter((_, j) => j !== i))

  const usedEx = new Set(entries.flatMap((e) => (e.kind === 'exercise' ? [e.exerciseId] : [])))
  const usedSongs = new Set(entries.flatMap((e) => (e.kind === 'song' ? [e.songId] : [])))
  const recent = recentExerciseIds(sessions)
  const matches = (title: string) => q === '' || norm(title).includes(q)

  const exResult = (id: string): Result => {
    const ex = getExercise(id)!
    const best = bestBpm(sessions, id)
    return { key: `ex:${id}`, label: ex.title, add: () => add({ kind: 'exercise', exerciseId: id, bpm: best === null ? '' : String(best) }) }
  }
  const recentResults = recent.filter((id) => !usedEx.has(id) && matches(getExercise(id)!.title)).map(exResult)
  const songResults: Result[] = songs
    .filter((s) => !usedSongs.has(s.id) && (q === '' ? s.status === 'learning' : matches(s.title)))
    .map((s) => ({ key: `song:${s.id}`, label: s.title, add: () => add({ kind: 'song', songId: s.id, mastered: false }) }))
  const otherResults =
    q === '' ? [] : EXERCISES.filter((e) => !usedEx.has(e.id) && !recent.includes(e.id) && matches(e.title)).map((e) => exResult(e.id))
  const results = [...recentResults, ...songResults, ...otherResults].slice(0, MAX_RESULTS)
  const canCreate = q !== '' && !songs.some((s) => norm(s.title) === q)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Qu'as-tu travaillé ?</h1>

      {entries.length > 0 && (
        <ul className="flex flex-col gap-2">
          {entries.map((e, i) => {
            if (e.kind === 'exercise') {
              const title = getExercise(e.exerciseId)?.title ?? 'Exo inconnu'
              return (
                <li key={`ex:${e.exerciseId}`} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
                  <span className="flex-1">{title}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    aria-label={`Tempo max · ${title}`}
                    placeholder="bpm"
                    value={e.bpm}
                    onChange={(ev) => update(i, { ...e, bpm: ev.target.value })}
                    className="w-20 rounded-lg border border-line bg-bg px-2 py-1 text-right tabular-nums"
                  />
                  <span className="text-sm text-muted">bpm</span>
                  <button type="button" aria-label={`Retirer ${title}`} className="px-1 text-muted" onClick={() => remove(i)}>
                    ✕
                  </button>
                </li>
              )
            }
            const s = songs.find((x) => x.id === e.songId)
            const title = s?.title ?? 'Morceau'
            return (
              <li key={`song:${e.songId}`} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
                <span className="flex-1">🎵 {title}</span>
                {s?.status === 'mastered' ? (
                  <span className="text-sm text-muted">déjà maîtrisé</span>
                ) : (
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      aria-label={`Maîtrisé · ${title}`}
                      checked={e.mastered}
                      onChange={(ev) => update(i, { ...e, mastered: ev.target.checked })}
                      className="h-5 w-5 accent-[var(--accent)]"
                    />
                    maîtrisé
                  </label>
                )}
                <button type="button" aria-label={`Retirer ${title}`} className="px-1 text-muted" onClick={() => remove(i)}>
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <input
        type="search"
        placeholder="Chercher un exo ou un morceau"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="rounded-xl border border-line bg-surface px-3 py-2"
      />
      <div className="flex flex-col gap-1">
        {results.map((r) => (
          <button key={r.key} type="button" onClick={r.add} className="rounded-xl px-3 py-2 text-left hover:bg-surface-2">
            + {r.label}
          </button>
        ))}
        {canCreate && (
          <button
            type="button"
            onClick={() => {
              onCreateSong(query.trim())
              setQuery('')
            }}
            className="rounded-xl px-3 py-2 text-left text-accent hover:bg-surface-2"
          >
            + Nouveau morceau « {query.trim()} »
          </button>
        )}
      </div>
    </div>
  )
}
