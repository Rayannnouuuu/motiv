import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { catalogSong } from '../../content/songCatalog'
import { useActions, useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { shortDate } from '../../domain/date'
import { activeSongs, catalogNotAdded } from '../../domain/songSuggestion'
import type { Song } from '../../domain/types'
import { Group, Row } from '../../ui/List'
import { Screen } from '../../ui/Screen'
import { useRun } from '../settings/useRun'

const SHOWN = 6

/** Coche ronde façon iOS (cocher = maîtrisé). */
function Check({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="hit tap flex shrink-0 cursor-pointer items-center gap-1.5">
      <input type="checkbox" aria-label={label} checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden
        className={`flex size-5.5 items-center justify-center rounded-full transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-guitar ${
          checked ? 'bg-guitar text-on-guitar' : 'border-[1.5px] border-faint'
        }`}
      >
        {checked && <Icon name="check" size="0.85em" />}
      </span>
      <span className="t-footnote text-muted">maîtrisé</span>
    </label>
  )
}

/**
 * Morceaux : ceux qu'on travaille (joués au moins une fois), les propositions du catalogue (un toucher ouvre
 * le log avec le morceau : une fois joué, il passe en cours) et le classement des morceaux maîtrisés.
 */
export function SongsPage() {
  const { data, today } = useAppData()
  const { saveSong } = useActions()
  const navigate = useNavigate()
  const { error, run } = useRun()
  const [showAll, setShowAll] = useState(false)
  const active = activeSongs(data.songs, data.guitarSessions)
  const learning = active.filter((s) => s.status === 'learning').sort((a, b) => a.title.localeCompare(b.title, 'fr'))
  // Classement : le plus dur d'abord, puis le plus récent.
  const mastered = data.songs
    .filter((s) => s.status === 'mastered')
    .sort((a, b) => (catalogSong(b.title)?.difficulty ?? 0) - (catalogSong(a.title)?.difficulty ?? 0) || (b.masteredOn ?? '').localeCompare(a.masteredOn ?? ''))
  const proposed = catalogNotAdded(active)
  const toggle = (s: Song) =>
    run(() => saveSong(s.status === 'mastered' ? { ...s, status: 'learning', masteredOn: null } : { ...s, status: 'mastered', masteredOn: today }))
  const level = (title: string) => {
    const c = catalogSong(title)
    return c ? `${c.artist} · niv. ${c.difficulty}` : undefined
  }

  return (
    <Screen title="Morceaux">
      <div className="flex flex-col gap-8 pb-4">
        {error && (
          <p role="alert" className="t-footnote px-4 text-danger">
            {error}
          </p>
        )}

        {learning.length > 0 && (
          <Group header="En cours" footer="Coche un morceau quand tu le maîtrises.">
            {learning.map((s) => (
              <Row key={s.id} title={s.title} subtitle={level(s.title)} accessory={<Check label={`Maîtrisé · ${s.title}`} checked={false} onChange={() => void toggle(s)} />} />
            ))}
          </Group>
        )}

        {proposed.length > 0 && (
          <Group header="Proposés" footer="Du plus facile au plus dur. Touche un morceau pour le logger : une fois joué, il passe en cours.">
            {(showAll ? proposed : proposed.slice(0, SHOWN)).map((c) => (
              <Row
                key={c.title}
                aria-label={`Jouer ${c.title}`}
                title={c.title}
                subtitle={`${c.artist} · niv. ${c.difficulty}${c.tuning !== 'Standard' ? ` · ${c.tuning}` : ''}`}
                detail={
                  <span className="t-subhead flex items-center gap-0.5 text-guitar">
                    <Icon name="play" />
                    Jouer
                  </span>
                }
                onClick={() => navigate('/log/guitare', { state: { songTitle: c.title } })}
              />
            ))}
            {proposed.length > SHOWN && (
              <Row onClick={() => setShowAll(!showAll)} chevron={false}>
                <span className="t-body text-guitar">{showAll ? 'Voir moins' : `Voir les ${proposed.length} morceaux`}</span>
              </Row>
            )}
          </Group>
        )}

        {mastered.length > 0 && (
          <Group header={`Maîtrisés · ${mastered.length}`} footer="Classés du plus dur au plus facile.">
            {mastered.map((s, i) => (
              <Row
                key={s.id}
                title={`${i + 1}. ${s.title}`}
                subtitle={[level(s.title), s.masteredOn && `le ${shortDate(s.masteredOn)}`].filter(Boolean).join(' · ')}
                accessory={<Check label={`Maîtrisé · ${s.title}`} checked onChange={() => void toggle(s)} />}
              />
            ))}
          </Group>
        )}
      </div>
    </Screen>
  )
}
