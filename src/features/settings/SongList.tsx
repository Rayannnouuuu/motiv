import { useState } from 'react'
import { useActions, useAppData } from '../../data/AppDataContext'
import type { Song } from '../../domain/types'
import { catalogNotAdded } from '../../domain/songSuggestion'
import { Group, Row } from '../../ui/List'
import { useRun } from './useRun'

const SHOWN = 6

/** Coche ronde façon iOS (cocher = maîtrisé). */
function Check({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="tap flex shrink-0 cursor-pointer items-center gap-1.5">
      <input type="checkbox" aria-label={label} checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden
        className={`flex h-[1.375rem] w-[1.375rem] items-center justify-center rounded-full transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${
          checked ? 'bg-guitar text-white' : 'border-[1.5px] border-faint'
        }`}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M2.5 6.2 5 8.6l4.5-5.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="t-footnote text-muted">maîtrisé</span>
    </label>
  )
}

function SongRow({ song, onSave }: { song: Song; onSave: (s: Song) => void }) {
  const { today } = useAppData()
  const [title, setTitle] = useState(song.title)
  const mastered = song.status === 'mastered'
  return (
    <div className="flex min-h-11 items-center gap-3 px-4 py-1.5">
      <input
        aria-label={`Titre · ${song.title}`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title.trim() && title.trim() !== song.title && onSave({ ...song, title: title.trim() })}
        className={`t-body min-w-0 flex-1 bg-transparent py-1.5 outline-none ${mastered ? 'text-muted' : ''}`}
      />
      <Check
        label={`Maîtrisé · ${song.title}`}
        checked={mastered}
        onChange={() => onSave(mastered ? { ...song, status: 'learning', masteredOn: null } : { ...song, status: 'mastered', masteredOn: today })}
      />
    </div>
  )
}

export function SongList() {
  const { data } = useAppData()
  const { saveSong } = useActions()
  const { busy, error, run } = useRun()
  const [title, setTitle] = useState('')
  const [showAll, setShowAll] = useState(false)
  const suggestions = catalogNotAdded(data.songs)
  const songs = [...data.songs].sort((a, b) => (a.status === b.status ? a.title.localeCompare(b.title, 'fr') : a.status === 'learning' ? -1 : 1))
  const save = (s: Song) => run(() => saveSong(s))
  const add = () => {
    if (title.trim() === '') return
    void save({ id: crypto.randomUUID(), title: title.trim(), status: 'learning', masteredOn: null })
    setTitle('')
  }

  return (
    <>
      <Group header="Morceaux" footer={songs.length === 0 ? "Aucun morceau pour l'instant." : 'Touche un titre pour le renommer.'}>
        {songs.map((s) => (
          <SongRow key={s.id} song={s} onSave={save} />
        ))}
        <form
          className="flex min-h-11 items-center gap-3 px-4 py-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <input
            aria-label="Nouveau morceau"
            placeholder="Nouveau morceau"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="t-body min-w-0 flex-1 bg-transparent py-1.5 outline-none placeholder:text-faint"
          />
          <button type="submit" aria-label="Ajouter le morceau" disabled={title.trim() === ''} className="tap t-body font-semibold text-accent disabled:text-faint">
            Ajouter
          </button>
        </form>
      </Group>
      {error && (
        <p role="alert" className="t-footnote -mt-6 px-4 text-danger">
          {error}
        </p>
      )}

      {suggestions.length > 0 && (
        <Group header="Morceaux à essayer" footer="Du plus facile au plus dur (difficulté estimée sur 10).">
          {(showAll ? suggestions : suggestions.slice(0, SHOWN)).map((c) => (
            <Row
              key={c.title}
              title={c.title}
              subtitle={`${c.artist} · niv. ${c.difficulty}${c.tuning !== 'Standard' ? ` · ${c.tuning}` : ''}`}
              accessory={
                <button
                  type="button"
                  aria-label={`Ajouter ${c.title}`}
                  disabled={busy}
                  className="tap-scale t-subhead shrink-0 rounded-full bg-accent/12 px-3.5 py-1.5 font-semibold text-accent disabled:opacity-35"
                  onClick={() => save({ id: crypto.randomUUID(), title: c.title, status: 'learning', masteredOn: null })}
                >
                  Ajouter
                </button>
              }
            />
          ))}
          {suggestions.length > SHOWN && (
            <Row onClick={() => setShowAll(!showAll)} chevron={false}>
              <span className="t-body text-accent">{showAll ? 'Voir moins' : `Voir les ${suggestions.length} morceaux`}</span>
            </Row>
          )}
        </Group>
      )}
    </>
  )
}
