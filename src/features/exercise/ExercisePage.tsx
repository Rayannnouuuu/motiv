import { Link, useNavigate, useParams } from 'react-router-dom'
import { CATEGORY_LABELS, getExercise } from '../../content/exercises'
import { tipsFor } from '../../content/tips'
import { useAppData } from '../../data/AppDataContext'
import { bestBpm } from '../../domain/records'
import { Button } from '../../ui/Button'
import { TabView } from '../../ui/TabView'

function DifficultyMeter({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5" role="img" aria-label={`Difficulté ${value}/10`}>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < value ? 'bg-accent' : 'bg-surface-2'}`} />
      ))}
    </span>
  )
}

/** Fiche détaillée d'un exo : description, tempo, tablature, conseils. */
export function ExercisePage() {
  const { id = '' } = useParams()
  const { data } = useAppData()
  const navigate = useNavigate()
  const ex = getExercise(id)

  if (!ex)
    return (
      <div className="flex flex-col gap-3">
        <p className="font-semibold">Exo inconnu</p>
        <Link to="/" className="text-accent underline">
          Retour
        </Link>
      </div>
    )

  const best = bestBpm(data.guitarSessions, ex.id)

  return (
    <div className="flex flex-col gap-5">
      <button type="button" className="self-start text-sm text-muted" onClick={() => navigate(-1)}>
        ← Retour
      </button>
      <div>
        <p className="flex items-center gap-2 text-sm text-muted">
          {CATEGORY_LABELS[ex.category]} · niveau {ex.difficulty}/10 <DifficultyMeter value={ex.difficulty} />
        </p>
        <h1 className="mt-1 text-2xl font-bold">{ex.title}</h1>
        <p className="mt-2">{ex.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface p-3">
          <p className="text-xs text-muted">Tempo cible</p>
          <p className="text-xl font-semibold tabular-nums">{ex.targetBpm} bpm</p>
        </div>
        <div className="rounded-xl bg-surface p-3">
          <p className="text-xs text-muted">Ton record</p>
          <p className="text-xl font-semibold tabular-nums">{best === null ? '—' : `${best} bpm`}</p>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Tablature</h2>
        <TabView pattern={ex.pattern} />
        <p className="text-xs text-muted">Joue la boucle en continu · h = hammer-on · b = bend · PM = palm mute</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Conseils</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
          {tipsFor(ex.category, ex.difficulty).map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <Button onClick={() => navigate('/log/guitare', { state: { exerciseId: ex.id } })}>Logger cet exo</Button>
    </div>
  )
}
