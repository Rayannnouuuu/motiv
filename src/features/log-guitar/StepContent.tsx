import { useState } from 'react'
import { EXERCISES, getExercise } from '../../content/exercises'
import { SONG_CATALOG, normTitle } from '../../content/songCatalog'
import { Icon } from '../../design/icons'
import { bestBpm } from '../../domain/records'
import { activeSongs, catalogNotAdded } from '../../domain/songSuggestion'
import type { Challenge, GuitarSession, Song } from '../../domain/types'

/** `clean` : le tempo noté a été joué proprement (il compte pour monter de 4 bpm). */
export type Entry = { kind: 'exercise'; exerciseId: string; bpm: string; clean?: boolean } | { kind: 'song'; songId: string; mastered: boolean }

const MAX_RESULTS = 8

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

/** Ids d'exos connus, du plus récent au plus ancien. */
function recentExerciseIds(sessions: GuitarSession[]): string[] {
  const ids: string[] = []
  for (const s of [...sessions].sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt)))
    for (const it of s.items) if (it.kind === 'exercise' && !ids.includes(it.exerciseId) && getExercise(it.exerciseId)) ids.push(it.exerciseId)
  return ids
}

type Result = { key: string; label: string; add: () => void; tag?: 'objectif' | 'du jour' }

export function StepContent({
  entries,
  songs,
  sessions,
  planned,
  challenges = [],
  onEntries,
  onCreateSong,
}: {
  entries: Entry[]
  songs: Song[]
  sessions: GuitarSession[]
  /** Exos proposés aujourd'hui, affichés en premier. */
  planned: string[]
  /** Défis guitare en cours : leur exo ou morceau est mis en avant. */
  challenges?: Challenge[]
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
  const challengeBpm = new Map(challenges.flatMap((c) => (c.target.kind === 'bpm' ? [[c.target.exerciseId, c.target.bpm] as const] : [])))
  const challengeSongs = new Set(challenges.flatMap((c) => (c.target.kind === 'song' ? [c.target.songId] : [])))
  const challengeResults: Result[] = [...challengeBpm.keys()]
    .filter((id) => getExercise(id) && !usedEx.has(id) && matches(getExercise(id)!.title))
    .map((id) => ({ ...exResult(id), tag: 'objectif' }))
  const plannedResults: Result[] = planned
    .filter((id) => getExercise(id) && !usedEx.has(id) && !challengeBpm.has(id) && matches(getExercise(id)!.title))
    .map((id) => ({ ...exResult(id), tag: 'du jour' }))
  const recentResults = recent
    .filter((id) => !usedEx.has(id) && !planned.includes(id) && !challengeBpm.has(id) && matches(getExercise(id)!.title))
    .map(exResult)
  // Sans recherche : seulement tes morceaux en cours (déjà joués), pas ceux juste ajoutés.
  const active = activeSongs(songs, sessions)
  const activeIds = new Set(active.map((s) => s.id))
  const songResults: Result[] = songs
    .filter((s) => !usedSongs.has(s.id) && (q === '' ? s.status === 'learning' && activeIds.has(s.id) : matches(s.title)))
    .map((s) => ({ key: `song:${s.id}`, label: s.title, add: () => add({ kind: 'song', songId: s.id, mastered: false }) }))
  const otherResults =
    q === ''
      ? []
      : EXERCISES.filter((e) => !usedEx.has(e.id) && !recent.includes(e.id) && !planned.includes(e.id) && !challengeBpm.has(e.id) && matches(e.title)).map(
          (e) => exResult(e.id),
        )
  // Morceaux du catalogue pas encore dans ta liste : les choisir les ajoute automatiquement.
  const mine = new Set(active.map((s) => normTitle(s.title)))
  // Sans recherche : les deux plus faciles du catalogue, pour pouvoir logger un morceau proposé sans l'ajouter avant.
  const catalogResults: Result[] = (
    q === '' ? catalogNotAdded(active).slice(0, 2) : SONG_CATALOG.filter((c) => !mine.has(normTitle(c.title)) && (matches(c.title) || matches(c.artist)))
  ).map((c) => ({
    key: `cat:${c.title}`,
    label: `${c.title} · ${c.artist}`,
    add: () => {
      // Déjà dans ta liste sans avoir été joué : on reprend ce morceau plutôt que d'en créer un double.
      const existing = songs.find((s) => normTitle(s.title) === normTitle(c.title))
      if (existing) add({ kind: 'song', songId: existing.id, mastered: false })
      else onCreateSong(c.title)
      setQuery('')
    },
  }))
  // Morceaux en cours avant les anciens exos : sinon, après quelques jours de logs, ils ne tiennent plus dans la liste.
  const results = [...challengeResults, ...plannedResults, ...songResults, ...catalogResults, ...recentResults, ...otherResults].slice(0, MAX_RESULTS)
  const canCreate = q !== '' && !songs.some((s) => norm(s.title) === q) && !SONG_CATALOG.some((c) => norm(c.title) === q)

  const removeButton = (title: string, i: number) => (
    <button type="button" aria-label={`Retirer ${title}`} className="hit tap shrink-0 py-1" onClick={() => remove(i)}>
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <circle cx="11" cy="11" r="10" className="fill-danger" />
        <path d="M6.5 11h9" className="stroke-on-danger" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </button>
  )

  return (
    <div className="flex flex-col gap-5">
      <h1 className="t-title1">Qu'as-tu travaillé ?</h1>

      {entries.length > 0 && (
        <ul className="rows overflow-hidden rounded-md bg-surface" aria-label="Travaillé pendant la séance">
          {entries.map((e, i) => {
            if (e.kind === 'exercise') {
              const title = getExercise(e.exerciseId)?.title ?? 'Exo inconnu'
              const goal = challengeBpm.get(e.exerciseId)
              return (
                <li key={`ex:${e.exerciseId}`} className="animate-rise flex flex-col gap-1 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    {removeButton(title, i)}
                    <span className="t-body min-w-0 flex-1">{title}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      aria-label={`Tempo max · ${title}`}
                      placeholder="—"
                      value={e.bpm}
                      onChange={(ev) => update(i, { ...e, bpm: ev.target.value })}
                      className="t-body min-h-11 w-16 rounded-sm bg-fill px-2 py-1.5 text-right tabular-nums outline-none placeholder:text-muted"
                    />
                    <span className="t-footnote text-muted">bpm</span>
                    <label className="hit tap t-footnote flex items-center gap-1.5 text-muted">
                      <input
                        type="checkbox"
                        aria-label={`Propre · ${title}`}
                        checked={e.clean === true}
                        onChange={(ev) => update(i, { ...e, clean: ev.target.checked })}
                        className="h-5 w-5 accent-[var(--guitar)]"
                      />
                      propre
                    </label>
                  </div>
                  {goal !== undefined && (
                    <p className="t-footnote flex items-center gap-1 pl-8.5 font-semibold text-guitar">
                      <Icon name={Number(e.bpm) >= goal ? 'check' : 'target'} />
                      {Number(e.bpm) >= goal ? `Objectif atteint : ${goal} bpm` : `Objectif du cycle : note ton tempo max, cible ${goal} bpm`}
                    </p>
                  )}
                </li>
              )
            }
            const s = songs.find((x) => x.id === e.songId)
            const title = s?.title ?? 'Morceau'
            return (
              <li key={`song:${e.songId}`} className="animate-rise flex flex-col gap-1 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  {removeButton(title, i)}
                  <span className="t-body flex min-w-0 flex-1 items-center gap-1.5">
                    <Icon name="song" className="text-guitar" />
                    {title}
                  </span>
                  {s?.status === 'mastered' ? (
                    <span className="t-footnote text-muted">déjà maîtrisé</span>
                  ) : (
                    <label className="hit tap t-footnote flex items-center gap-1.5 text-muted">
                      <input
                        type="checkbox"
                        aria-label={`Maîtrisé · ${title}`}
                        checked={e.mastered}
                        onChange={(ev) => update(i, { ...e, mastered: ev.target.checked })}
                        className="h-5 w-5 accent-[var(--guitar)]"
                      />
                      maîtrisé
                    </label>
                  )}
                </div>
                {challengeSongs.has(e.songId) && (
                  <p className="t-footnote flex items-center gap-1 pl-8.5 font-semibold text-guitar">
                    <Icon name="target" />
                    Objectif du cycle : coche « maîtrisé » quand tu le joues en entier
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <label className="flex min-h-11 items-center gap-2 rounded-md bg-fill px-2.5 py-2">
          <Icon name="search" className="text-muted" />
          <input
            type="search"
            placeholder="Chercher un exo, un morceau"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="t-body min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
          />
        </label>
        {(results.length > 0 || canCreate) && (
          <div className="rows overflow-hidden rounded-md bg-surface">
            {results.map((r) => (
              <button
                key={r.key}
                type="button"
                aria-label={`Ajouter ${r.label}`}
                onClick={r.add}
                className="tap-row flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left"
              >
                <span className="t-body flex min-w-0 flex-1 items-center gap-1.5">
                  <Icon name="plus" className="text-guitar" />
                  {r.label}
                </span>
                {r.tag && (
                  <span aria-hidden className="t-caption flex shrink-0 items-center gap-0.5 rounded-full bg-guitar/12 px-2 py-0.5 font-semibold text-guitar">
                    {r.tag === 'objectif' && <Icon name="target" />}
                    {r.tag}
                  </span>
                )}
              </button>
            ))}
            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  onCreateSong(query.trim())
                  setQuery('')
                }}
                className="tap-row t-body flex min-h-11 w-full items-center gap-1.5 px-4 py-2.5 text-left text-guitar"
              >
                <Icon name="plus" />
                Nouveau morceau « {query.trim()} »
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
