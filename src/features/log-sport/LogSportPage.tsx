import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useActions, useAppData } from '../../data/AppDataContext'
import { todayParis } from '../../domain/date'
import { nextProgram } from '../../domain/progression'
import type { Rating } from '../../domain/types'
import { Button } from '../../ui/Button'
import { Chip } from '../../ui/Chip'
import { RatingPicker } from '../../ui/RatingPicker'
import { WeightInput } from '../../ui/WeightInput'
import { Stepper } from '../../ui/Stepper'
import {
  activeExercises,
  elapsedMin,
  formatWeight,
  isStale,
  liveReducer,
  loadLive,
  prefillFor,
  recentSetsFor,
  resolveIndex,
  saveLive,
  type LiveAction,
  type LiveState,
} from './liveSession'

const MAX_DURATION = 600

const shortDate = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export function LogSportPage() {
  const { data } = useAppData()
  const navigate = useNavigate()
  const [live, setLive] = useState<LiveState | null>(loadLive)
  // Évalué à l'ouverture : une séance reprise après plus de 12 h demande quoi en faire.
  const [askStale, setAskStale] = useState(() => live !== null && isStale(live, new Date()))
  const [editing, setEditing] = useState<{ exerciseId: string; setIndex: number; before: { weightKg: number; reps: number } } | null>(null)
  const [confirmAbandon, setConfirmAbandon] = useState(false)

  useEffect(() => saveLive(live), [live])
  // Écrit tout de suite : la page peut être démontée avant l'effet (navigation).
  const clear = () => {
    saveLive(null)
    setLive(null)
  }

  const program = live && data.programs.find((p) => p.id === live.programId)
  const exercises = activeExercises(program ?? undefined)

  if (!live) return <ChooseProgram onStart={setLive} />

  const close = (
    <button type="button" aria-label="Fermer" className="self-start text-xl text-muted" onClick={() => navigate('/')}>
      ✕
    </button>
  )

  if (askStale) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-4 text-center">
        <p className="text-lg font-semibold">Une séance commencée il y a plus de 12 h n'a pas été terminée.</p>
        <Button
          onClick={() => {
            setLive(liveReducer(live, { type: 'finish' }, exercises))
            setAskStale(false)
          }}
        >
          Terminer
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            clear()
            navigate('/')
          }}
        >
          Abandonner
        </Button>
      </div>
    )
  }

  const index = resolveIndex(live, exercises)
  const dispatch = (a: LiveAction) => setLive((s) => (s ? liveReducer(s, a, exercises) : s))
  const abandon = () => {
    clear()
    navigate('/')
  }
  // Série validée en cours de modification, et les valeurs à remettre si on annule.
  const stopEditing = (restore: boolean) => {
    if (restore && editing) dispatch({ type: 'load', ...editing.before })
    setEditing(null)
  }
  const goBack = () => {
    const prev = exercises[Math.min(index, exercises.length) - 1]
    const p = prev ? prefillFor(prev, data.sportSessions) : { weightKg: 0, reps: 1 }
    dispatch({ type: 'prevExercise', prefill: { weightKg: p.weightKg, reps: p.reps } })
  }

  if (index >= exercises.length)
    return (
      <FinishSession
        live={live}
        onDone={clear}
        onBack={exercises.length > 0 ? goBack : undefined}
        onAbandon={abandon}
      />
    )

  const current = exercises[index]
  const recent = recentSetsFor(current, data.sportSessions)
  const doneSets = live.sets.filter((s) => s.programExerciseId === current.id)
  const next = exercises[index + 1]
  const boxes = Math.max(current.targetSets, doneSets.length + 1)
  const edited = editing?.exerciseId === current.id ? editing : null
  const startEditing = (setIndex: number) => {
    const s = doneSets[setIndex - 1]
    const before = edited ? edited.before : { weightKg: live.weightKg, reps: live.reps }
    setEditing({ exerciseId: current.id, setIndex, before })
    dispatch({ type: 'load', weightKg: s.weightKg, reps: s.reps })
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        {close}
        <p className="text-sm text-muted">
          {program?.name} · exo {index + 1}/{exercises.length}
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{current.name}</h1>
        <p className="text-muted">
          {current.targetSets}×{current.targetReps} visé
        </p>
      </div>

      {recent.length > 0 ? (
        <section className="flex flex-col gap-1.5 rounded-xl bg-surface p-3" aria-label="Tes dernières fois">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Tes dernières fois</p>
          {recent.map((r) => (
            <div key={r.day} className="flex items-baseline gap-2 text-sm">
              <span className="w-14 shrink-0 text-muted">{shortDate(r.day)}</span>
              <span className="flex flex-wrap gap-1">
                {r.sets.map((x) => (
                  <span key={x.setIndex} className="rounded-md bg-surface-2 px-1.5 py-0.5 tabular-nums">
                    {formatWeight(x.weightKg)} × {x.reps}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </section>
      ) : (
        <p className="text-sm text-muted">Première fois sur cet exo : choisis une charge confortable.</p>
      )}

      <Stepper label="Charge" onMinus={() => dispatch({ type: 'weight', delta: -2.5 })} onPlus={() => dispatch({ type: 'weight', delta: 2.5 })}>
        <WeightInput
          aria-label="Charge (kg)"
          value={live.weightKg}
          onChange={(kg) => dispatch({ type: 'setWeight', weightKg: kg })}
          className="w-full bg-transparent text-center text-3xl font-bold tabular-nums"
        />
        <p className="text-xs text-muted">{live.weightKg === 0 ? 'PDC' : 'kg'}</p>
      </Stepper>
      <Stepper label="Reps" onMinus={() => dispatch({ type: 'reps', delta: -1 })} onPlus={() => dispatch({ type: 'reps', delta: 1 })}>
        <p className="text-3xl font-bold tabular-nums" aria-label="Reps">
          {live.reps}
        </p>
      </Stepper>

      <ol className="flex gap-2" aria-label="Séries">
        {Array.from({ length: boxes }, (_, i) => {
          const s = doneSets[i]
          return (
            <li key={i} className="flex flex-1">
              {s ? (
                <button
                  type="button"
                  aria-label={`Modifier la série ${i + 1}`}
                  aria-pressed={edited?.setIndex === i + 1}
                  onClick={() => startEditing(i + 1)}
                  className={`flex h-12 flex-1 items-center justify-center rounded-xl bg-sport text-sm text-white tabular-nums ${edited?.setIndex === i + 1 ? 'ring-2 ring-offset-2 ring-sport' : ''}`}
                >
                  {s.reps}×{formatWeight(s.weightKg)}
                </button>
              ) : (
                <span className="flex h-12 flex-1 items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted tabular-nums">{i + 1}</span>
              )}
            </li>
          )
        })}
      </ol>

      {!edited && doneSets.length > 0 && <p className="-mt-4 text-xs text-muted">Touche une série faite pour la corriger.</p>}

      <div className="mt-auto flex flex-col gap-2">
        {edited ? (
          <>
            <Button
              onClick={() => {
                dispatch({ type: 'updateSet', setIndex: edited.setIndex })
                stopEditing(true)
              }}
            >
              ✓ Enregistrer la série {edited.setIndex}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => stopEditing(true)}>
                Annuler
              </Button>
              <Button
                variant="ghost"
                className="flex-1 text-danger"
                onClick={() => {
                  dispatch({ type: 'deleteSet', setIndex: edited.setIndex })
                  stopEditing(true)
                }}
              >
                Supprimer la série
              </Button>
            </div>
          </>
        ) : (
          <Button onClick={() => dispatch({ type: 'completeSet' })}>✓ Série {doneSets.length + 1} faite</Button>
        )}
        <div className={`flex gap-2 ${edited ? 'hidden' : ''}`}>
          {index > 0 && (
            <Button variant="ghost" onClick={goBack}>
              ← Précédent
            </Button>
          )}
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              const p = next ? prefillFor(next, data.sportSessions) : { weightKg: 0, reps: 1 }
              dispatch({ type: 'nextExercise', prefill: { weightKg: p.weightKg, reps: p.reps } })
            }}
          >
            {next ? 'Exo suivant →' : 'Fin de séance →'}
          </Button>
        </div>
        {confirmAbandon ? (
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmAbandon(false)}>
              Continuer
            </Button>
            <Button variant="ghost" className="flex-1 text-danger" onClick={abandon}>
              Oui, abandonner
            </Button>
          </div>
        ) : (
          <button type="button" className="py-1 text-sm text-muted underline" onClick={() => setConfirmAbandon(true)}>
            Abandonner la séance
          </button>
        )}
      </div>
    </div>
  )
}

function ChooseProgram({ onStart }: { onStart: (s: LiveState) => void }) {
  const { data } = useAppData()
  const navigate = useNavigate()
  const programs = data.programs.filter((p) => !p.archived).sort((a, b) => a.position - b.position)
  const [programId, setProgramId] = useState(() => nextProgram(data.programs, data.sportSessions)?.id ?? null)

  if (programs.length === 0) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-4 text-center">
        <p>Pas encore de programme.</p>
        <Link to="/reglages" className="rounded-xl bg-accent px-4 py-3 font-semibold text-white">
          Créer ton programme
        </Link>
      </div>
    )
  }

  function start() {
    const program = programs.find((p) => p.id === programId)
    if (!program) return
    const first = activeExercises(program)[0]
    const p = first ? prefillFor(first, data.sportSessions) : { weightKg: 0, reps: 1 }
    onStart({
      id: crypto.randomUUID(),
      programId: program.id,
      startedAt: new Date().toISOString(),
      exerciseIndex: 0,
      exerciseId: first?.id ?? null,
      weightKg: p.weightKg,
      reps: p.reps,
      sets: [],
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <button type="button" aria-label="Fermer" className="self-start text-xl text-muted" onClick={() => navigate('/')}>
        ✕
      </button>
      <h1 className="text-2xl font-bold">Quelle séance ?</h1>
      <div className="flex flex-wrap gap-2">
        {programs.map((p) => (
          <Chip key={p.id} selected={p.id === programId} onClick={() => setProgramId(p.id)}>
            {p.name}
          </Chip>
        ))}
      </div>
      <Button className="mt-auto" disabled={!programId} onClick={start}>
        Commencer
      </Button>
    </div>
  )
}

function FinishSession({ live, onDone, onBack, onAbandon }: { live: LiveState; onDone: () => void; onBack?: () => void; onAbandon: () => void }) {
  const actions = useActions()
  const navigate = useNavigate()
  const [duration, setDuration] = useState(() => {
    // Séance oubliée (> 12 h) : pas de durée crédible à proposer.
    const m = elapsedMin(live, new Date())
    return isStale(live, new Date()) ? '' : String(Math.min(m, MAX_DURATION))
  })
  const [flow, setFlow] = useState<Rating | null>(null)
  const [desire, setDesire] = useState<Rating | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const noSets = live.sets.length === 0

  const min = Number(duration)
  const validDuration = Number.isInteger(min) && min > 0 && min <= MAX_DURATION

  async function finish() {
    if (noSets || !validDuration || flow === null || desire === null) return
    setSaving(true)
    setError(null)
    try {
      const result = await actions.saveSportSession({
        id: live.id,
        day: todayParis(new Date(live.startedAt)),
        programId: live.programId,
        durationMin: min,
        sets: live.sets,
        flowRating: flow,
        desireRating: desire,
      })
      onDone()
      navigate('/xp', { replace: true, state: { result, domain: 'sport', logId: live.id } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {onBack && (
        <button type="button" className="self-start text-sm text-muted" onClick={onBack}>
          ← Revenir au dernier exo
        </button>
      )}
      <h1 className="text-2xl font-bold">Séance terminée 💪</h1>
      <p className="text-muted">
        {live.sets.length} série{live.sets.length > 1 ? 's' : ''} enregistrée{live.sets.length > 1 ? 's' : ''}
      </p>
      <label className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_DURATION}
          aria-label="Durée en minutes"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-28 rounded-xl border border-line bg-surface px-3 py-2 text-lg tabular-nums"
        />
        <span className="text-muted">min</span>
      </label>
      <RatingPicker label="Temps oublié" value={flow} onChange={setFlow} />
      <RatingPicker label="Envie d'y retourner" value={desire} onChange={setDesire} />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {noSets && <p className="text-sm text-muted">Aucune série cochée : rien à enregistrer. Reviens à l'exo ou abandonne la séance.</p>}
      <div className="mt-auto flex flex-col gap-2">
        <Button disabled={noSets || !validDuration || flow === null || desire === null || saving} onClick={finish}>
          Terminer
        </Button>
        {confirmAbandon ? (
          <Button variant="ghost" onClick={onAbandon}>
            Oui, abandonner (rien n'est enregistré)
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmAbandon(true)}>
            Abandonner la séance
          </Button>
        )}
      </div>
    </div>
  )
}
