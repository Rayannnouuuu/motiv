import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CATEGORY_LABELS, getExercise } from '../../content/exercises'
import { tipsFor } from '../../content/tips'
import { useAppData } from '../../data/AppDataContext'
import { bestBpm } from '../../domain/records'
import { Button } from '../../ui/Button'
import { Gauge } from '../../ui/Gauge'
import { TabView } from '../../ui/TabView'
import { loadPractice, practiceReducer, runningPracticeMinutes, savePractice } from '../practice/practiceSession'
import { Metronome } from './Metronome'

const HISTORY_SIZE = 8

const shortDate = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })

function DifficultyMeter({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5" role="img" aria-label={`Difficulté ${value}/10`}>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < value ? 'bg-accent' : 'bg-fill-strong'}`} />
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
  // Dernier tempo joué au métronome sur cet exo, transmis au log.
  const [played, setPlayed] = useState<{ exerciseId: string; bpm: number } | null>(null)
  // Un chrono guitare tourne : l'exo se coche dans le chrono plutôt que d'ouvrir un log à part (temps compté deux fois).
  const [chrono] = useState(() => runningPracticeMinutes() !== null)

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
  const playedBpm = played?.exerciseId === ex.id ? played.bpm : null

  return (
    <div className="flex flex-col gap-6 pb-4">
      <button type="button" className="tap t-body -ml-1.5 flex items-center gap-1 self-start pt-2.5 pb-1 text-accent" onClick={() => navigate(-1)}>
        <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden>
          <path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Retour
      </button>
      <div className="flex flex-col gap-2">
        <p className="t-footnote flex items-center gap-2 font-semibold text-muted uppercase">
          {CATEGORY_LABELS[ex.category]} · niveau {ex.difficulty}/10 <DifficultyMeter value={ex.difficulty} />
        </p>
        <h1 className="t-title1">{ex.title}</h1>
        <p className="t-body text-muted">{ex.description}</p>
      </div>

      <section className="flex flex-col gap-3 rounded-[1.25rem] bg-surface p-4 shadow-card" aria-labelledby="tempo-title">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="tempo-title" className="t-headline">
            Ton meilleur tempo
          </h2>
          <p className="t-title2 tabular-nums">{best === null ? '—' : `${best} bpm`}</p>
        </div>
        <Gauge value={best ?? 0} max={ex.targetBpm} color="guitar" label={`Meilleur tempo ${best ?? 0} sur ${ex.targetBpm} bpm`} className="h-2" />
        <p className="t-subhead tabular-nums">
          {best !== null && best >= ex.targetBpm ? (
            <span className="font-semibold text-guitar">Tempo cible atteint ✓ ({ex.targetBpm} bpm)</span>
          ) : (
            <span className="text-muted">Tempo cible : {ex.targetBpm} bpm</span>
          )}
          {challengeBpm !== null && <span className="font-semibold text-accent"> · 🎯 défi : {challengeBpm} bpm</span>}
        </p>
        <p className="t-footnote text-muted">
          C'est le tempo le plus rapide que tu as noté en loggant cet exo (champ « tempo max » du log guitare). Pour le monter, logge un nouveau tempo ; pour
          corriger une erreur, corrige le log concerné ci-dessous.
        </p>
        {history.length > 0 && (
          <ul className="rows -mx-4 -mb-4 border-t border-line" aria-label="Historique des tempos">
            {history.map((h) => (
              <li key={h.sessionId}>
                <Link to={`/log/corriger/${h.sessionId}`} className="tap-row t-body flex min-h-11 items-center gap-3 px-4 py-2" aria-label={`Corriger le log du ${shortDate(h.day)}`}>
                  <span className="text-muted">{shortDate(h.day)}</span>
                  <span className="flex-1 text-right font-semibold tabular-nums">{h.bpm} bpm</span>
                  <span className="t-subhead text-accent">Corriger</span>
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
        targetBpm={ex.targetBpm}
        challengeBpm={challengeBpm}
        onPlayed={(bpm) => setPlayed({ exerciseId: ex.id, bpm })}
      />

      <section className="flex flex-col gap-2">
        <h2 className="t-footnote px-4 text-muted uppercase">Tablature</h2>
        <TabView pattern={ex.pattern} />
        <p className="t-footnote px-4 text-muted">Joue la boucle en continu · h = hammer-on · b = bend · PM = palm mute</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="t-footnote px-4 text-muted uppercase">Conseils</h2>
        <ul className="rows t-body flex flex-col overflow-hidden rounded-[0.75rem] bg-surface">
          {tipsFor(ex.category, ex.difficulty).map((t) => (
            <li key={t} className="flex gap-3 px-4 py-3">
              <span aria-hidden className="text-accent">
                •
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      {chrono ? (
        <Button
          onClick={() => {
            const s = loadPractice()
            if (s) savePractice(practiceReducer(s, { type: 'checkExercise', id: ex.id, bpm: playedBpm }))
            navigate('/jouer')
          }}
        >
          ✓ Cocher dans le chrono
        </Button>
      ) : (
        <Button onClick={() => navigate('/log/guitare', { state: playedBpm === null ? { exerciseId: ex.id } : { exerciseId: ex.id, bpm: playedBpm } })}>
          Logger cet exo
        </Button>
      )}
    </div>
  )
}
