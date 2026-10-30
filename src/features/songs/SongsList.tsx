import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { catalogSong } from '../../content/songCatalog'
import { useActions, useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { shortDate } from '../../domain/date'
import type { Song, SongStatus } from '../../domain/model'
import { MAINTAIN_DAYS, SONG_STATUS_LABELS } from '../../domain/repertoire'
import { catalogNotAdded } from '../../domain/songSuggestion'
import { Button } from '../../ui/Button'
import { Group, Row } from '../../ui/List'
import { Sheet } from '../../ui/Sheet'
import { useRun } from '../settings/useRun'

const SHOWN = 6
const STATUSES: SongStatus[] = ['to_learn', 'learning', 'maintain', 'mastered']
const GROUPS: [SongStatus, string, string][] = [
  ['learning', 'En cours', 'Change le statut quand un morceau est maîtrisé.'],
  ['maintain', 'À entretenir', `Il revient dans Aujourd'hui après ${MAINTAIN_DAYS} jours sans être joué.`],
  ['to_learn', 'À apprendre', 'Il passe en cours dès que tu le joues.'],
]

/** Un morceau, ouvert d'un toucher sur sa ligne : ses quatre statuts en grands boutons, et le jouer tout de suite. */
function SongSheet({ song, onStatus, onPlay, onClose }: { song: Song; onStatus: (s: SongStatus) => void; onPlay: () => void; onClose: () => void }) {
  return (
    <Sheet label={song.title} onClose={onClose} title={() => <h2 className="t-headline truncate text-center">{song.title}</h2>}>
      {(close) => (
        <div className="flex flex-col gap-5">
          {song.artist && <p className="t-subhead -mt-2 text-center text-muted">{song.artist}</p>}
          <div role="group" aria-label="Statut" className="grid grid-cols-2 gap-2">
            {STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                aria-pressed={song.status === st}
                onClick={() => (onStatus(st), close())}
                className={`tap-scale t-callout min-h-14 rounded-xl font-semibold ${song.status === st ? 'bg-guitar text-on-guitar' : 'bg-inset'}`}
              >
                {SONG_STATUS_LABELS[st]}
              </button>
            ))}
          </div>
          <Button tone="guitar" onClick={() => (close(), onPlay())}>
            <Icon name="play" />
            Jouer ce morceau
          </Button>
        </div>
      )}
    </Sheet>
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
  const [open, setOpen] = useState<string | null>(null)
  const openSong = v1.songs.find((x) => x.id === open)
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
    <Row
      key={x.id}
      aria-label={`Ouvrir ${x.title}`}
      title={title}
      subtitle={subtitle}
      detail={<span className="t-subhead text-guitar">{SONG_STATUS_LABELS[x.status]}</span>}
      onClick={() => setOpen(x.id)}
    />
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
      {openSong && (
        <SongSheet
          song={openSong}
          onStatus={(st) => void run(() => setSongStatus(openSong.id, st))}
          onPlay={() => navigate('/log/guitare', { state: { songTitle: openSong.title } })}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}
