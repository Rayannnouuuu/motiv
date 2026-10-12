import { useState } from 'react'
import { useActions, useAppData } from '../../data/AppDataContext'
import type { Song } from '../../domain/types'
import { catalogNotAdded } from '../../domain/songSuggestion'
import { useRun } from './useRun'

const input = 'rounded-lg border border-line bg-bg px-2 py-1'

function SongRow({ song, onSave }: { song: Song; onSave: (s: Song) => void }) {
  const { today } = useAppData()
  const [title, setTitle] = useState(song.title)
  const mastered = song.status === 'mastered'
  return (
    <li className="flex items-center gap-2">
      <input
        aria-label={`Titre · ${song.title}`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title.trim() && title.trim() !== song.title && onSave({ ...song, title: title.trim() })}
        className={`${input} min-w-0 flex-1`}
      />
      <label className="flex items-center gap-1 text-sm">
        <input
          type="checkbox"
          aria-label={`Maîtrisé · ${song.title}`}
          checked={mastered}
          onChange={() => onSave(mastered ? { ...song, status: 'learning', masteredOn: null } : { ...song, status: 'mastered', masteredOn: today })}
          className="h-5 w-5 accent-[var(--accent)]"
        />
        maîtrisé
      </label>
    </li>
  )
}

export function SongList() {
  const { data } = useAppData()
  const { saveSong } = useActions()
  const { busy, error, run } = useRun()
  const [title, setTitle] = useState('')
  const [showAll, setShowAll] = useState(false)
  const suggestions = catalogNotAdded(data.songs)
  const SHOWN = 6
  const songs = [...data.songs].sort((a, b) => (a.status === b.status ? a.title.localeCompare(b.title, 'fr') : a.status === 'learning' ? -1 : 1))
  const save = (s: Song) => run(() => saveSong(s))

  return (
    <section className="flex flex-col gap-3" aria-busy={busy}>
      <h2 className="text-lg font-semibold">Morceaux</h2>
      {songs.length === 0 && <p className="text-sm text-muted">Aucun morceau pour l'instant.</p>}
      <ul className="flex flex-col gap-2">
        {songs.map((s) => (
          <SongRow key={s.id} song={s} onSave={save} />
        ))}
      </ul>
      <div className="flex gap-2">
        <input aria-label="Nouveau morceau" placeholder="Nouveau morceau" value={title} onChange={(e) => setTitle(e.target.value)} className={`${input} min-w-0 flex-1`} />
        <button
          type="button"
          aria-label="Ajouter le morceau"
          disabled={title.trim() === ''}
          className="font-semibold text-accent disabled:opacity-40"
          onClick={() => {
            void save({ id: crypto.randomUUID(), title: title.trim(), status: 'learning', masteredOn: null })
            setTitle('')
          }}
        >
          Ajouter
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">Morceaux à essayer</h3>
          <p className="text-xs text-muted">Du plus facile au plus dur (difficulté estimée sur 10).</p>
          <ul className="flex flex-col gap-1">
            {(showAll ? suggestions : suggestions.slice(0, SHOWN)).map((c) => (
              <li key={c.title} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{c.title}</p>
                  <p className="truncate text-xs text-muted">
                    {c.artist} · niv. {c.difficulty}
                    {c.tuning !== 'Standard' && ` · ${c.tuning}`}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Ajouter ${c.title}`}
                  disabled={busy}
                  className="shrink-0 font-semibold text-accent disabled:opacity-40"
                  onClick={() => save({ id: crypto.randomUUID(), title: c.title, status: 'learning', masteredOn: null })}
                >
                  + Ajouter
                </button>
              </li>
            ))}
          </ul>
          {suggestions.length > SHOWN && (
            <button type="button" className="self-start text-sm text-muted underline" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Voir moins' : `Voir les ${suggestions.length} morceaux`}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
