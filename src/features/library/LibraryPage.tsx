import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CATEGORY_LABELS, EXERCISES, type ExerciseCategory } from '../../content/exercises'
import { MUSCLE_GROUP_LABELS } from '../../content/sportLibrary'
import { useAppData } from '../../data/AppDataContext'
import type { Movement } from '../../domain/model'
import { bestBpm } from '../../domain/records'
import { Group, Row } from '../../ui/List'
import { Screen } from '../../ui/Screen'
import { Segmented } from '../../ui/Segmented'
import { ProgramEditor } from '../settings/ProgramEditor'
import { SongsList } from '../songs/SongsList'
import { MovementSheet } from './MovementSheet'

type View = 'exercices' | 'morceaux' | 'modeles'
const VIEWS: { value: View; label: string }[] = [
  { value: 'exercices', label: 'Exercices' },
  { value: 'morceaux', label: 'Morceaux' },
  { value: 'modeles', label: 'Modèles' },
]

/** Bibliothèque : exercices (guitare et sport), morceaux, modèles de séance. La vue est dans l'adresse (?vue=). */
export function LibraryPage() {
  const [params, setParams] = useSearchParams()
  const view = VIEWS.find((v) => v.value === params.get('vue'))?.value ?? 'exercices'
  return (
    <Screen title="Bibliothèque">
      <div className="flex flex-col gap-6">
        <Segmented label="Vue" options={VIEWS} value={view} onChange={(v) => setParams({ vue: v }, { replace: true })} />
        {view === 'exercices' ? <Exercises /> : view === 'morceaux' ? <SongsList /> : <ProgramEditor />}
      </div>
    </Screen>
  )
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
