import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useActions, useAppData } from '../../data/AppDataContext'
import { todayParis } from '../../domain/date'
import { nextProgram } from '../../domain/progression'
import type { Rating } from '../../domain/types'
import { Button } from '../../ui/Button'
import { RatingPicker } from '../../ui/RatingPicker'
import { WeightInput } from '../../ui/WeightInput'
import { ModalBar } from '../../ui/ModalBar'
import { haptic } from '../../ui/spring'
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


  if (askStale) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-3 text-center">
        <p className="text-[3rem]" aria-hidden>
          ⏱️
        </p>
        <p className="t-title3 pb-3">Une séance commencée il y a plus de 12 h n'a pas été terminée.</p>
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
          <span className="text-danger">Abandonner</span>
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
    <div className="flex flex-1 flex-col gap-5">
      <ModalBar
        onCancel={() => navigate('/')}
        cancelLabel="Fermer"
        cancelAria="Fermer"
        title={
          <span className="flex flex-col items-center leading-tight">
            <span>{program?.name}</span>
            <span className="t-caption font-normal text-muted tabular-nums">
              exo {index + 1}/{exercises.length}
            </span>
          </span>
        }
      />

      <div key={current.id} className="animate-rise">
        <h1 className="t-title1">{current.name}</h1>
        <p className="t-body text-muted">
          {current.targetSets}×{current.targetReps} visé
        </p>
      </div>

      {recent.length > 0 ? (
        <section className="flex flex-col gap-2 rounded-[1rem] bg-surface px-4 py-3 shadow-card" aria-label="Tes dernières fois">
          <p className="t-footnote font-semibold text-muted uppercase">Tes dernières fois</p>
          {recent.map((r) => (
            <div key={r.day} className="t-subhead flex items-baseline gap-2">
              <span className="w-14 shrink-0 text-muted">{shortDate(r.day)}</span>
              <span className="flex flex-wrap gap-1">
                {r.sets.map((x) => (
                  <span key={x.setIndex} className="rounded-[0.375rem] bg-fill px-1.5 py-0.5 tabular-nums">
                    {formatWeight(x.weightKg)} × {x.reps}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </section>
      ) : (
        <p className="t-subhead text-muted">Première fois sur cet exo : choisis une charge confortable.</p>
      )}

      <div className="flex flex-col gap-4 rounded-[1.25rem] bg-surface p-4 shadow-card">
      <Stepper label="Charge" onMinus={() => dispatch({ type: 'weight', delta: -2.5 })} onPlus={() => dispatch({ type: 'weight', delta: 2.5 })}>
        <WeightInput
          aria-label="Charge (kg)"
          value={live.weightKg}
          onChange={(kg) => dispatch({ type: 'setWeight', weightKg: kg })}
          className="t-large w-full bg-transparent text-center tabular-nums outline-none"
        />
        <p className="t-footnote text-muted">{live.weightKg === 0 ? 'PDC' : 'kg'}</p>
      </Stepper>
      <Stepper label="Reps" onMinus={() => dispatch({ type: 'reps', delta: -1 })} onPlus={() => dispatch({ type: 'reps', delta: 1 })}>
        <p className="t-large tabular-nums" aria-label="Reps">
          {live.reps}
        </p>
      </Stepper>
      </div>

      <ol className="flex flex-wrap gap-2" aria-label="Séries">
        {Array.from({ length: boxes }, (_, i) => {
          const s = doneSets[i]
          return (
            <li key={i} className="flex min-w-[3.5rem] flex-1">
              {s ? (
                <button
                  type="button"
                  aria-label={`Modifier la série ${i + 1}`}
                  aria-pressed={edited?.setIndex === i + 1}
                  onClick={() => startEditing(i + 1)}
                  className={`tap-scale animate-pop t-subhead flex h-12 flex-1 items-center justify-center rounded-full bg-sport font-semibold text-white tabular-nums ${edited?.setIndex === i + 1 ? 'ring-2 ring-sport ring-offset-2 ring-offset-bg' : ''}`}
                >
                  {s.reps}×{formatWeight(s.weightKg)}
                </button>
              ) : (
                <span className="t-subhead flex h-12 flex-1 items-center justify-center rounded-full border-[1.5px] border-dashed border-faint text-muted tabular-nums">{i + 1}</span>
              )}
            </li>
          )
        })}
      </ol>

      {!edited && doneSets.length > 0 && <p className="t-footnote -mt-3 text-muted">Touche une série faite pour la corriger.</p>}

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
                className="flex-1 !text-danger"
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
          <Button
            onClick={() => {
              haptic('success')
              dispatch({ type: 'completeSet' })
            }}
          >
            ✓ Série {doneSets.length + 1} faite
          </Button>
        )}
        <div className={`flex gap-2 ${edited ? 'hidden' : ''}`}>
          {index > 0 && (
            <Button variant="ghost" onClick={goBack}>
              ‹ Précédent
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
            <Button variant="ghost" className="flex-1 !text-danger" onClick={abandon}>
              Oui, abandonner
            </Button>
          </div>
        ) : (
          <button type="button" className="tap t-subhead py-1.5 text-danger" onClick={() => setConfirmAbandon(true)}>
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
        <p className="text-[3rem]" aria-hidden>
          🏋️
        </p>
        <p className="t-title3">Pas encore de programme.</p>
        <Link to="/reglages" className="tap-scale t-headline rounded-[0.875rem] bg-accent px-4 py-3.5 text-white">
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
    <div className="flex flex-1 flex-col gap-5">
      <ModalBar onCancel={() => navigate('/')} cancelAria="Fermer" />
      <h1 className="t-title1">Quelle séance ?</h1>
      <div className="rows overflow-hidden rounded-[0.75rem] bg-surface" role="group" aria-label="Séances">
        {programs.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === programId}
            aria-label={p.name}
            aria-describedby={`prog-${p.id}`}
            onClick={() => setProgramId(p.id)}
            className="tap-row flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="t-headline">{p.name}</span>
              <span id={`prog-${p.id}`} className="t-footnote truncate text-muted">
                {activeExercises(p)
                  .map((e) => e.name)
                  .join(' · ')}
              </span>
            </span>
            <span
              aria-hidden
              className={`flex h-[1.375rem] w-[1.375rem] shrink-0 items-center justify-center rounded-full ${p.id === programId ? 'bg-accent text-white' : 'border-[1.5px] border-faint'}`}
            >
              {p.id === programId && (
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M2.5 6.2 5 8.6l4.5-5.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          </button>
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
      {onBack ? <ModalBar onCancel={onBack} cancelLabel="‹ Revenir au dernier exo" /> : <div className="h-11" />}
      <div className="animate-rise">
        <h1 className="t-title1">Séance terminée 💪</h1>
        <p className="t-body text-muted">
          {live.sets.length} série{live.sets.length > 1 ? 's' : ''} enregistrée{live.sets.length > 1 ? 's' : ''}
        </p>
      </div>
      <label className="flex items-center gap-3 rounded-[0.75rem] bg-surface px-4 py-2">
        <span className="t-body flex-1">Durée</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_DURATION}
          aria-label="Durée en minutes"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="t-title3 w-24 bg-transparent text-right tabular-nums outline-none placeholder:text-faint"
          placeholder="—"
        />
        <span className="t-body text-muted">min</span>
      </label>
      <RatingPicker label="Temps oublié" value={flow} onChange={setFlow} />
      <RatingPicker label="Envie d'y retourner" value={desire} onChange={setDesire} />
      {error && (
        <p role="alert" className="t-subhead text-danger">
          {error}
        </p>
      )}
      {noSets && <p className="t-subhead text-muted">Aucune série cochée : rien à enregistrer. Reviens à l'exo ou abandonne la séance.</p>}
      <div className="mt-auto flex flex-col gap-2">
        <Button disabled={noSets || !validDuration || flow === null || desire === null || saving} onClick={finish}>
          Terminer
        </Button>
        {confirmAbandon ? (
          <Button variant="ghost" className="!text-danger" onClick={onAbandon}>
            Oui, abandonner (rien n'est enregistré)
          </Button>
        ) : (
          <Button variant="ghost" className="!text-danger" onClick={() => setConfirmAbandon(true)}>
            Abandonner la séance
          </Button>
        )}
      </div>
    </div>
  )
}
