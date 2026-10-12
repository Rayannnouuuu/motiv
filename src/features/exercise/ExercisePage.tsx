import { Link, useNavigate, useParams } from 'react-router-dom'
import { CATEGORY_LABELS, getExercise } from '../../content/exercises'
import { tipsFor } from '../../content/tips'
import { useAppData } from '../../data/AppDataContext'
import { bestBpm } from '../../domain/records'
import { Button } from '../../ui/Button'
import { Gauge } from '../../ui/Gauge'
import { TabView } from '../../ui/TabView'

const HISTORY_SIZE = 8

const shortDate = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })

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
  const history = data.guitarSessions
    .flatMap((sess) =>
      sess.items.flatMap((it) =>
        it.kind === 'exercise' && it.exerciseId === ex.id && it.maxBpm !== null ? [{ sessionId: sess.id, day: sess.day, createdAt: sess.createdAt, bpm: it.maxBpm }] : [],
      ),
    )
    .sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, HISTORY_SIZE)
  const challenge = data.challenges.find((c) => c.status === 'active' && c.target.kind === 'bpm' && c.target.exerciseId === ex.id)
  const challengeBpm = challenge?.target.kind === 'bpm' ? challenge.target.bpm : null

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

      <section className="flex flex-col gap-2 rounded-xl bg-surface p-4" aria-labelledby="tempo-title">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="tempo-title" className="font-semibold">
            Ton meilleur tempo
          </h2>
          <p className="text-xl font-bold tabular-nums">{best === null ? '—' : `${best} bpm`}</p>
        </div>
        <Gauge value={best ?? 0} max={ex.targetBpm} color="guitar" label={`Meilleur tempo ${best ?? 0} sur ${ex.targetBpm} bpm`} className="h-2" />
        <p className="text-sm tabular-nums">
          {best !== null && best >= ex.targetBpm ? (
            <span className="font-medium text-guitar">Tempo cible atteint ✓ ({ex.targetBpm} bpm)</span>
          ) : (
            <span className="text-muted">Tempo cible : {ex.targetBpm} bpm</span>
          )}
          {challengeBpm !== null && <span className="text-accent"> · 🎯 défi : {challengeBpm} bpm</span>}
        </p>
        <p className="text-xs text-muted">
          C'est le tempo le plus rapide que tu as noté en loggant cet exo (champ « tempo max » du log guitare). Pour le monter, logge un nouveau tempo ; pour
          corriger une erreur, corrige le log concerné ci-dessous.
        </p>
        {history.length > 0 && (
          <ul className="mt-1 flex flex-col divide-y divide-line" aria-label="Historique des tempos">
            {history.map((h) => (
              <li key={h.sessionId} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                <span className="text-muted">{shortDate(h.day)}</span>
                <span className="flex-1 text-right font-semibold tabular-nums">{h.bpm} bpm</span>
                <Link to={`/log/corriger/${h.sessionId}`} className="text-xs text-muted underline">
                  Corriger
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

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
