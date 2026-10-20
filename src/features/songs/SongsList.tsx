import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { catalogSong } from '../../content/songCatalog'
import { useActions, useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { shortDate } from '../../domain/date'
import type { Song, SongStatus } from '../../domain/model'
import { MAINTAIN_DAYS, SONG_STATUS_LABELS } from '../../domain/repertoire'
import { catalogNotAdded } from '../../domain/songSuggestion'
import { Group, Row } from '../../ui/List'
import { useRun } from '../settings/useRun'

const SHOWN = 6
const STATUSES: SongStatus[] = ['to_learn', 'learning', 'maintain', 'mastered']
const GROUPS: [SongStatus, string, string][] = [
  ['learning', 'En cours', 'Change le statut quand un morceau est maîtrisé.'],
  ['maintain', 'À entretenir', `Il revient dans Aujourd'hui après ${MAINTAIN_DAYS} jours sans être joué.`],
  ['to_learn', 'À apprendre', 'Il passe en cours dès que tu le joues.'],
]

/** Statut d'un morceau, au sélecteur natif (une roue sur iPhone). */
function StatusPicker({ song, onChange }: { song: Song; onChange: (s: SongStatus) => void }) {
  return (
    <select
      aria-label={`Statut · ${song.title}`}
      value={song.status}
      onChange={(e) => onChange(e.target.value as SongStatus)}
      className="hit t-subhead shrink-0 bg-transparent text-right text-guitar outline-none"
    >
      {STATUSES.map((st) => (
        <option key={st} value={st}>
          {SONG_STATUS_LABELS[st]}
        </option>
      ))}
    </select>
  )
}

/**
 * Répertoire : en cours, à entretenir, à apprendre, les propositions du catalogue (un toucher ouvre le log avec
 * le morceau) et le classement des morceaux maîtrisés. Le statut se change sur chaque morceau.
 */
export function SongsList() {
  const { v1 } = useAppData()
  const { setSongStatus } = useActions()
  const navigate = useNavigate()
  const { error, run } = useRun()
  const [showAll, setShowAll] = useState(false)
  const mine = (st: SongStatus) => v1.songs.filter((x) => x.status === st).sort((a, b) => a.title.localeCompare(b.title, 'fr'))
  // Classement : le plus dur d'abord, puis le plus récent.
  const mastered = mine('mastered').sort(
    (a, b) => (catalogSong(b.title)?.difficulty ?? 0) - (catalogSong(a.title)?.difficulty ?? 0) || (b.masteredOn ?? '').localeCompare(a.masteredOn ?? ''),
  )
  const proposed = catalogNotAdded(v1.songs)
  const level = (x: Song) => {
    const c = catalogSong(x.title)
    return [x.artist || c?.artist, c && `niv. ${c.difficulty}`].filter(Boolean).join(' · ') || undefined
  }
  const row = (x: Song, title = x.title, subtitle = level(x)) => (
    <Row key={x.id} title={title} subtitle={subtitle} accessory={<StatusPicker song={x} onChange={(st) => void run(() => setSongStatus(x.id, st))} />} />
  )

  return (
    <div className="flex flex-col gap-8 pb-4">
      {error && (
        <p role="alert" className="t-footnote px-4 text-danger">
          {error}
        </p>
      )}

      {GROUPS.map(([st, header, footer]) => {
        const list = mine(st)
        return (
          list.length > 0 && (
            <Group key={st} header={header} footer={footer} labelledBy={`repertoire-${st}`}>
              {list.map((x) => row(x))}
            </Group>
          )
        )
      })}

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
          {mastered.map((x, i) => row(x, `${i + 1}. ${x.title}`, [level(x), x.masteredOn && `le ${shortDate(x.masteredOn)}`].filter(Boolean).join(' · ')))}
        </Group>
      )}
    </div>
  )
}
