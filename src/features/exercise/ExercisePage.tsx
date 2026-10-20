import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CATEGORY_LABELS, getExercise } from '../../content/exercises'
import { tipsFor } from '../../content/tips'
import { useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { shortDate } from '../../domain/date'
import { bestBpm } from '../../domain/records'
import { Button } from '../../ui/Button'
import { Gauge } from '../../ui/Gauge'
import { TabView } from '../../ui/TabView'
import { loadPractice, practiceReducer, runningPracticeMinutes, savePractice } from '../practice/practiceSession'
import { Metronome } from './Metronome'

const HISTORY_SIZE = 8

function DifficultyMeter({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5" role="img" aria-label={`Difficulté ${value}/10`}>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={`size-1.5 rounded-full ${i < value ? 'bg-guitar' : 'bg-fill-strong'}`} />
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
  // Tempo le plus rapide joué au métronome sur cet exo (pas le dernier : on redescend souvent pour nettoyer), transmis au log.
  const [played, setPlayed] = useState<{ exerciseId: string; bpm: number } | null>(null)
  // Un chrono guitare tourne : l'exo se coche dans le chrono plutôt que d'ouvrir un log à part (temps compté deux fois).
  const [chrono] = useState(() => runningPracticeMinutes() !== null)

  if (!ex)
    return (
      <div className="flex flex-col gap-3">
        <p className="font-semibold">Exo inconnu</p>
        <Link to="/" className="text-guitar underline">
          Retour
        </Link>
      </div>
    )

  const best = bestBpm(data.guitarSessions, ex.id)
  const history = data.guitarSessions
    .flatMap((sess) =>
      sess.items.flatMap((it) =>
        it.kind === 'exercise' && it.exerciseId === ex.id && it.maxBpm !== null
          ? [{ sessionId: sess.id, day: sess.day, createdAt: sess.createdAt, bpm: it.maxBpm }]
          : [],
      ),
    )
    .sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, HISTORY_SIZE)
  const challenge = data.challenges.find((c) => c.status === 'active' && c.target.kind === 'bpm' && c.target.exerciseId === ex.id)
  const challengeBpm = challenge?.target.kind === 'bpm' ? challenge.target.bpm : null
  const playedBpm = played?.exerciseId === ex.id ? played.bpm : null

  return (
    <div className="animate-page flex flex-col gap-6 pb-4">
      <button type="button" className="hit tap t-body -ml-2.5 flex items-center self-start pt-2.5 pb-1 text-guitar" onClick={() => navigate(-1)}>
        <Icon name="chevron" size="1.5em" className="rotate-180" />
        Retour
      </button>
      <div className="flex flex-col gap-2">
        <p className="t-footnote flex items-center gap-2 font-semibold text-muted uppercase">
          {CATEGORY_LABELS[ex.category]} · niveau {ex.difficulty}/10 <DifficultyMeter value={ex.difficulty} />
        </p>
        <h1 className="t-title1">{ex.title}</h1>
        <p className="t-body text-muted">{ex.description}</p>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card" aria-labelledby="tempo-title">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="tempo-title" className="t-headline">
            Ton meilleur tempo
          </h2>
          <p className="t-title2 tabular-nums">{best === null ? '—' : `${best} bpm`}</p>
        </div>
        <Gauge value={best ?? 0} max={ex.targetBpm} color="guitar" label={`Meilleur tempo ${best ?? 0} sur ${ex.targetBpm} bpm`} className="h-2" />
        <p className="t-subhead tabular-nums">
          {best !== null && best >= ex.targetBpm ? (
            <span className="font-semibold text-guitar">
              Tempo cible atteint ({ex.targetBpm} bpm) <Icon name="check" />
            </span>
          ) : (
            <span className="text-muted">Tempo cible : {ex.targetBpm} bpm</span>
          )}
          {challengeBpm !== null && (
            <span className="font-semibold text-guitar">
              {' · '}
              <Icon name="target" /> défi : {challengeBpm} bpm
            </span>
          )}
        </p>
        <p className="t-footnote text-muted">
          C'est le tempo le plus rapide que tu as noté en loggant cet exo (champ « tempo max » du log guitare). Pour le monter, logge un nouveau tempo ; pour
          corriger une erreur, corrige le log concerné ci-dessous.
        </p>
        {history.length > 0 && (
          <ul className="rows -mx-4 -mb-4 border-t border-line" aria-label="Historique des tempos">
            {history.map((h) => (
              <li key={h.sessionId}>
                <Link
                  to={`/log/corriger/${h.sessionId}`}
                  className="tap-row t-body flex min-h-11 items-center gap-3 px-4 py-2"
                  aria-label={`Corriger le log du ${shortDate(h.day)}`}
                >
                  <span className="text-muted">{shortDate(h.day)}</span>
                  <span className="flex-1 text-right font-semibold tabular-nums">{h.bpm} bpm</span>
                  <span className="t-subhead text-guitar">Corriger</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Metronome
        key={ex.id}
        pattern={ex.pattern}
        best={best}
        startBpm={ex.startBpm}
        targetBpm={ex.targetBpm}
        challengeBpm={challengeBpm}
        onPlayed={(bpm) => setPlayed((p) => (p?.exerciseId === ex.id && p.bpm >= bpm ? p : { exerciseId: ex.id, bpm }))}
      />

      <section className="flex flex-col gap-2">
        <h2 className="t-footnote px-4 text-muted uppercase">Tablature</h2>
        <TabView pattern={ex.pattern} />
        <p className="t-footnote px-4 text-muted">Joue la boucle en continu · h = hammer-on · b = bend · PM = palm mute</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="t-footnote px-4 text-muted uppercase">Conseils</h2>
        <ul className="rows t-body flex flex-col overflow-hidden rounded-md bg-surface">
          {tipsFor(ex.category, ex.difficulty).map((t) => (
            <li key={t} className="flex gap-3 px-4 py-3">
              <span aria-hidden className="text-guitar">
                •
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      {chrono ? (
        <Button
          tone="guitar"
          onClick={() => {
            const s = loadPractice()
            if (s) savePractice(practiceReducer(s, { type: 'checkExercise', id: ex.id, bpm: playedBpm }))
            navigate('/jouer')
          }}
        >
          <Icon name="check" />
          Cocher dans le chrono
        </Button>
      ) : (
        <Button
          tone="guitar"
          onClick={() => navigate('/log/guitare', { state: playedBpm === null ? { exerciseId: ex.id } : { exerciseId: ex.id, bpm: playedBpm } })}
        >
          Logger cet exo
        </Button>
      )}
    </div>
  )
}
