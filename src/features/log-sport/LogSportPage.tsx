import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useActions, useAppData } from '../../data/AppDataContext'
import { todayParis } from '../../domain/date'
import { nextProgram } from '../../domain/progression'
import type { Rating } from '../../domain/types'
import { Button } from '../../ui/Button'
import { Chip } from '../../ui/Chip'
import { RatingPicker } from '../../ui/RatingPicker'
import { Stepper } from '../../ui/Stepper'
import {
  activeExercises,
  elapsedMin,
  formatWeight,
  isStale,
  liveReducer,
  loadLive,
  prefillFor,
  resolveIndex,
  saveLive,
  type LiveAction,
  type LiveState,
} from './liveSession'

const MAX_DURATION = 600

export function LogSportPage() {
  const { data } = useAppData()
  const navigate = useNavigate()
  const [live, setLive] = useState<LiveState | null>(loadLive)
  // Évalué à l'ouverture : une séance reprise après plus de 12 h demande quoi en faire.
  const [askStale, setAskStale] = useState(() => live !== null && isStale(live, new Date()))

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

  if (index >= exercises.length) return <FinishSession live={live} onDone={clear} />

  const current = exercises[index]
  const prefill = prefillFor(current, data.sportSessions)
  const doneSets = live.sets.filter((s) => s.programExerciseId === current.id)
  const next = exercises[index + 1]
  const boxes = Math.max(current.targetSets, doneSets.length + 1)

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
          {prefill.summary && ` · ${prefill.summary}`}
        </p>
      </div>

      <Stepper label="Charge" onMinus={() => dispatch({ type: 'weight', delta: -2.5 })} onPlus={() => dispatch({ type: 'weight', delta: 2.5 })}>
        <input
          type="number"
          inputMode="decimal"
          step={2.5}
          min={0}
          aria-label="Charge (kg)"
          value={live.weightKg}
          onChange={(e) => dispatch({ type: 'setWeight', weightKg: Number(e.target.value) })}
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
            <li
              key={i}
              className={`flex h-12 flex-1 items-center justify-center rounded-xl text-sm tabular-nums ${s ? 'bg-sport text-white' : 'border border-dashed border-line text-muted'}`}
            >
              {s ? `${s.reps}×${formatWeight(s.weightKg)}` : i + 1}
            </li>
          )
        })}
      </ol>

      <div className="mt-auto flex flex-col gap-2">
        <Button onClick={() => dispatch({ type: 'completeSet' })}>✓ Série {doneSets.length + 1} faite</Button>
        <Button
          variant="secondary"
          onClick={() => {
            const p = next ? prefillFor(next, data.sportSessions) : { weightKg: 0, reps: 1 }
            dispatch({ type: 'nextExercise', prefill: { weightKg: p.weightKg, reps: p.reps } })
          }}
        >
          {next ? 'Exo suivant →' : 'Fin de séance →'}
        </Button>
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

function FinishSession({ live, onDone }: { live: LiveState; onDone: () => void }) {
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

  const min = Number(duration)
  const validDuration = Number.isInteger(min) && min > 0 && min <= MAX_DURATION

  async function finish() {
    if (!validDuration || flow === null || desire === null) return
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
      navigate('/xp', { replace: true, state: { result, domain: 'sport' } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
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
      <Button className="mt-auto" disabled={!validDuration || flow === null || desire === null || saving} onClick={finish}>
        Terminer
      </Button>
    </div>
  )
}
