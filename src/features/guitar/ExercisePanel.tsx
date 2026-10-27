import { useState } from 'react'
import { getExercise } from '../../content/exercises'
import { useAppData } from '../../data/AppDataContext'
import { EMPTY_PROGRESS, unlockedExercises } from '../../domain/guitar/engine'
import { bestBpm } from '../../domain/records'
import { TabView } from '../../ui/TabView'
import { Metronome } from '../exercise/Metronome'

/**
 * L'exercice du bloc : tablature, métronome réglé, et un choix d'autres exercices (ceux de la compétence d'abord,
 * puis tous ceux déjà débloqués). `startAt` règle le métronome sur l'exercice principal (premier de `ids`).
 */
export function ExercisePanel({ ids, startAt, onTempo }: { ids: string[]; startAt?: number; onTempo?: (bpm: number) => void }) {
  const { data, v1 } = useAppData()
  const [id, setId] = useState(ids[0])
  const ex = getExercise(id)
  const mine = ids.filter((x) => getExercise(x))
  const others = unlockedExercises(v1.profile.guitar?.progress ?? EMPTY_PROGRESS)
    .filter((e) => !mine.includes(e.id))
    .sort((a, b) => a.category.localeCompare(b.category) || a.difficulty - b.difficulty)
  if (!ex) return null
  const primary = id === ids[0]
  return (
    <div className="flex flex-col gap-3">
      <label className="t-subhead flex items-center justify-between gap-3">
        <span className="text-muted">Exercice</span>
        <select
          aria-label="Exercice"
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="tap t-callout min-h-11 max-w-[70%] min-w-0 appearance-none truncate bg-transparent text-right font-semibold text-guitar"
        >
          <optgroup label="Pour cette compétence">
            {mine.map((x) => (
              <option key={x} value={x}>
                {getExercise(x)!.title}
              </option>
            ))}
          </optgroup>
          {others.length > 0 && (
            <optgroup label="Autres exercices">
              {others.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>
      <p className="t-footnote text-muted">{ex.description}</p>
      <TabView pattern={ex.pattern} />
      <Metronome
        key={ex.id}
        pattern={ex.pattern}
        best={bestBpm(data.guitarSessions, ex.id)}
        startBpm={ex.startBpm}
        startAt={primary ? startAt : undefined}
        targetBpm={ex.targetBpm}
        challengeBpm={null}
        onTempo={primary ? onTempo : undefined}
      />
    </div>
  )
}
