import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { CATEGORY_LABELS, EXERCISES, type ExerciseCategory } from '../../content/exercises'
import { MUSCLE_GROUP_LABELS } from '../../content/sportLibrary'
import { useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import type { Movement } from '../../domain/model'
import { bestBpm } from '../../domain/records'
import { Group, Row } from '../../ui/List'
import { Screen } from '../../ui/Screen'
import { ProgramEditor } from '../settings/ProgramEditor'
import { SongsList } from '../songs/SongsList'
import { MovementSheet } from './MovementSheet'

const back = (
  <Link to="/moi" className="hit tap t-body flex items-center text-accent">
    <Icon name="chevron" size="1.4em" className="rotate-180" />
    Moi
  </Link>
)

/** Moi › Exercices : guitare et sport. */
export function ExercisesPage() {
  return (
    <Screen title="Exercices" overline="Moi" leading={back}>
      <Exercises />
    </Screen>
  )
}

/** Moi › Morceaux : le répertoire. */
export function SongsPage() {
  return (
    <Screen title="Morceaux" overline="Moi" leading={back}>
      <SongsList />
    </Screen>
  )
}

/** Moi › Modèles de séance. */
export function ModelsPage() {
  return (
    <Screen title="Modèles de séance" overline="Moi" leading={back}>
      <ProgramEditor />
    </Screen>
  )
}

/** Ancienne adresse `/bibliotheque?vue=…` : renvoie vers la page qui a pris sa place. */
export function LibraryRedirect() {
  const [params] = useSearchParams()
  const to = { morceaux: '/moi/morceaux', modeles: '/moi/modeles' }[params.get('vue') ?? ''] ?? '/moi/exercices'
  return <Navigate to={to} replace />
}

const repRange = (m: Movement) =>
  m.repRange ? `${m.repRange[0]}-${m.repRange[1]} reps` : m.metric === 'duration' ? 'durée' : m.metric === 'distance' ? 'distance' : null

function Exercises() {
  const { data, v1 } = useAppData()
  const [editing, setEditing] = useState<Movement | null>(null)
  const sport = v1.exercises.filter((m) => !m.archived).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  return (
    <div className="flex flex-col gap-6 pb-4">
      {(Object.keys(CATEGORY_LABELS) as ExerciseCategory[]).map((cat) => (
        <Group key={cat} header={`Guitare · ${CATEGORY_LABELS[cat]}`} labelledBy={`biblio-${cat}`}>
          {EXERCISES.filter((e) => e.category === cat)
            .sort((a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title, 'fr'))
            .map((e) => {
              const best = bestBpm(data.guitarSessions, e.id)
              return (
                <Row
                  key={e.id}
                  to={`/exo/${e.id}`}
                  title={e.title}
                  subtitle={`Niveau ${e.difficulty} · cible ${e.targetBpm} bpm`}
                  detail={best === null ? undefined : `${best} bpm`}
                />
              )
            })}
        </Group>
      ))}
      <Group header="Sport" footer="Touche un mouvement pour le modifier. Les tiens (nés d'un nom inconnu) sont à compléter.">
        {sport.map((m) => (
          <Row
            key={m.id}
            title={m.name}
            subtitle={[
              m.category ? MUSCLE_GROUP_LABELS[m.category] : 'à compléter',
              m.body && (m.body === 'upper' ? 'haut du corps' : 'bas du corps'),
              repRange(m),
            ]
              .filter(Boolean)
              .join(' · ')}
            onClick={() => setEditing(m)}
            aria-label={`Modifier ${m.name}`}
          />
        ))}
      </Group>
      {editing && <MovementSheet movement={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
