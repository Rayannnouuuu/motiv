import { useState } from 'react'
import { useAppData } from '../../data/AppDataContext'
import { getExercise } from '../../content/exercises'
import { Icon } from '../../design/icons'
import { TONE } from '../../design/tone'
import { longDate } from '../../domain/date'
import { formatPace } from '../../domain/marathon/paces'
import { runOf } from '../../domain/marathon/runs'
import type { Session } from '../../domain/model'
import { Button } from '../../ui/Button'
import { Group, Row } from '../../ui/List'
import { Screen } from '../../ui/Screen'
import { Segmented } from '../../ui/Segmented'

type Filter = 'all' | 'guitar' | 'sport'
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'guitar', label: 'Guitare' },
  { value: 'sport', label: 'Sport' },
]
const PAGE = 30

const km = (v: number) => `${v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`
const month = (day: string) => {
  const m = new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return m.charAt(0).toUpperCase() + m.slice(1)
}

/** Mes séances (lot 4) : tout ce qui a été fait, du plus récent au plus ancien ; un toucher ouvre le détail, corrigeable. */
export function HistoryPage() {
  const { data, v1 } = useAppData()
  const [filter, setFilter] = useState<Filter>('all')
  const [shown, setShown] = useState(PAGE)
  const programs = new Map(data.programs.map((p) => [p.id, p.name]))
  const songs = new Map(v1.songs.map((s) => [s.id, s.title]))

  const describe = (s: Session): { title: string; subtitle: string } => {
    const entries = s.blocks.flatMap((b) => b.entries)
    if (s.discipline === 'guitar') {
      const names = entries.flatMap((e) => (e.songId ? [songs.get(e.songId) ?? 'Morceau'] : e.exerciseId ? [getExercise(e.exerciseId)?.title ?? 'Exo'] : []))
      return { title: `Guitare · ${s.durationMin} min`, subtitle: names.join(', ') || 'Sans détail' }
    }
    const run = runOf(s)
    if (run)
      return {
        title: `Course · ${km(run.km)}`,
        subtitle: [run.sec > 0 ? `${Math.round(run.sec / 60)} min` : null, run.km > 0 && run.sec > 0 ? `${formatPace(run.sec / run.km)} /km` : null]
          .filter(Boolean)
          .join(' · '),
      }
    const sets = entries.reduce((t, e) => t + e.sets.length, 0)
    return {
      title: programs.get(s.templateId ?? '') ?? 'Séance de sport',
      subtitle: `${s.durationMin} min · ${entries.length} exo${entries.length > 1 ? 's' : ''} · ${sets} série${sets > 1 ? 's' : ''}`,
    }
  }

  const all = v1.sessions
    .filter((s) => filter === 'all' || s.discipline === filter)
    .sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt))
  const groups: { month: string; sessions: Session[] }[] = []
  for (const s of all.slice(0, shown)) {
    const m = month(s.day)
    if (groups.at(-1)?.month !== m) groups.push({ month: m, sessions: [] })
    groups.at(-1)!.sessions.push(s)
  }

  return (
    <Screen title="Mes séances" overline={`${all.length} séance${all.length > 1 ? 's' : ''}`}>
      <div className="flex flex-col gap-6">
        <Segmented label="Discipline" options={FILTERS} value={filter} onChange={(v) => setFilter(v as Filter)} />
        {all.length === 0 && <p className="t-subhead text-muted">Aucune séance pour l'instant.</p>}
        {groups.map((g) => (
          <Group key={g.month} header={g.month}>
            {g.sessions.map((s) => {
              const d = describe(s)
              return (
                <Row
                  key={s.id}
                  icon={<Icon name={s.discipline === 'sport' && !runOf(s) ? 'muscu' : s.discipline} className={TONE.text[s.discipline]} />}
                  title={d.title}
                  subtitle={`${longDate(s.day)} · ${d.subtitle}`}
                  to={`/log/corriger/${s.id}`}
                />
              )
            })}
          </Group>
        ))}
        {all.length > shown && (
          <Button variant="secondary" onClick={() => setShown(shown + PAGE)}>
            Voir plus
          </Button>
        )}
      </div>
    </Screen>
  )
}
