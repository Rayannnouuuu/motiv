import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useActions, useAppData } from '../../data/AppDataContext'
import { Icon, type IconName } from '../../design/icons'
import { TONE } from '../../design/tone'
import { shortDate, todayParis } from '../../domain/date'
import { nextProgram } from '../../domain/progression'
import { isSportRecord, setsForExercise } from '../../domain/records'
import { activeSetChallenge, isNewRecord, meetsChallenge } from '../../domain/setFeedback'
import type { Program, Rating, SportSet } from '../../domain/types'
import { Button } from '../../ui/Button'
import { Fireworks } from '../../ui/Fireworks'
import { noteOf } from '../../domain/note'
import { SessionFeedback } from '../../ui/SessionFeedback'
import { WeightInput } from '../../ui/WeightInput'
import { ModalBar } from '../../ui/ModalBar'
import { SessionTitle } from '../../ui/SessionTitle'
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
  tracking,
  type LiveAction,
  type LiveState,
  type Tracking,
} from './liveSession'
import { primeBeep } from './beep'
import { RestTimer } from './RestTimer'

const MAX_DURATION = 600
/** Durée du message « Record ! » / « Défi réussi ! ». */
const CHEER_MS = 2500

const nowIso = () => new Date().toISOString()

/** Nouvelle séance, sur le premier exo du programme, à la charge de la dernière fois. */
function newLive(program: Program, t: Tracking): LiveState {
  const first = activeExercises(program)[0]
  const p = first ? prefillFor(first, t) : { weightKg: 0, reps: 1 }
  return {
    id: crypto.randomUUID(),
    programId: program.id,
    startedAt: nowIso(),
    exerciseIndex: 0,
    exerciseId: first?.id ?? null,
    weightKg: p.weightKg,
    reps: p.reps,
    sets: [],
  }
}

/** Programme qu'on peut lancer tout de suite : actif, avec au moins un exo. */
const startable = (programs: Program[], id: string | null) => programs.find((p) => p.id === id && !p.archived && activeExercises(p).length > 0)

export function LogSportPage() {
  const { data, v1 } = useAppData()
  const track = useMemo(() => tracking(v1), [v1])
  const navigate = useNavigate()
  const navState = useLocation().state as { programId?: unknown } | null
  const requestedId = typeof navState?.programId === 'string' ? navState.programId : null
  // « Commencer X » sur l'accueil : la séance démarre directement sur son premier exo.
  const [live, setLive] = useState<LiveState | null>(() => {
    const saved = loadLive()
    if (saved) return saved
    const p = startable(data.programs, requestedId)
    return p ? newLive(p, track) : null
  })
  // Évalué à l'ouverture : une séance reprise après plus de 12 h demande quoi en faire.
  const [askStale, setAskStale] = useState(() => live !== null && isStale(live, new Date()))
  const [editing, setEditing] = useState<{ exerciseId: string; setIndex: number; before: { weightKg: number; reps: number } } | null>(null)
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  // Record ou défi rempli à l'instant : un message et des feux d'artifice.
  const [cheer, setCheer] = useState<{ id: number; lines: { icon: IconName; text: string }[] } | null>(null)

  useEffect(() => saveLive(live), [live])
  // Demande consommée : un retour arrière ou un rechargement ne relance pas de séance.
  useEffect(() => {
    if (requestedId !== null) navigate('.', { replace: true })
  }, [requestedId, navigate])
  useEffect(() => {
    if (!cheer) return
    const id = window.setTimeout(() => setCheer(null), CHEER_MS)
    return () => window.clearTimeout(id)
  }, [cheer])
  // Écrit tout de suite : la page peut être démontée avant l'effet (navigation).
  const clear = () => {
    saveLive(null)
    setLive(null)
  }

  const program = live && data.programs.find((p) => p.id === live.programId)
  const exercises = activeExercises(program ?? undefined)

  if (!live) return <ChooseProgram onStart={setLive} preferred={requestedId} />

  if (askStale) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-3 text-center">
        <Icon name="timer" size="3em" className="self-center text-sport" />
        <p className="t-title3 pb-3">Une séance commencée il y a plus de 12 h n'a pas été terminée.</p>
        <Button
          tone="sport"
          onClick={() => {
            setLive(liveReducer(live, { type: 'finish' }, exercises))
            setAskStale(false)
          }}
        >
          Terminer
        </Button>
        <Button
          variant="ghost"
          tone="danger"
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
    const p = prev ? prefillFor(prev, track) : { weightKg: 0, reps: 1 }
    dispatch({ type: 'prevExercise', prefill: { weightKg: p.weightKg, reps: p.reps } })
  }

  if (index >= exercises.length) return <FinishSession live={live} onDone={clear} onBack={exercises.length > 0 ? goBack : undefined} onAbandon={abandon} />

  const current = exercises[index]
  const recent = recentSetsFor(track.key(current.id), track.history)
  const proposal = prefillFor(current, track)
  const doneSets = live.sets.filter((s) => s.programExerciseId === current.id)
  const done = doneSets.length
  const next = exercises[index + 1]
  const targetSets = current.targetSets
  // Objectif de séries atteint : l'action principale devient l'exo suivant.
  const reached = done >= targetSets
  const boxes = Math.max(targetSets, done)
  const edited = editing?.exerciseId === current.id ? editing : null
  const historySets = setsForExercise(track.history, track.key(current.id))
  const challenge = activeSetChallenge(data.challenges, current.id)
  const challengeMet = challenge !== null && doneSets.some((s) => meetsChallenge(challenge.target, s))
  const goNext = () => {
    const p = next ? prefillFor(next, track) : { weightKg: 0, reps: 1 }
    dispatch({ type: 'nextExercise', prefill: { weightKg: p.weightKg, reps: p.reps } })
  }
  const completeSet = () => {
    primeBeep()
    haptic('success')
    const set: SportSet = { programExerciseId: current.id, setIndex: done + 1, reps: live.reps, weightKg: live.weightKg }
    const lines: { icon: IconName; text: string }[] = []
    if (isNewRecord(historySets, doneSets, set)) lines.push({ icon: 'trophy', text: `Record ! ${formatWeight(set.weightKg)} × ${set.reps}` })
    if (challenge && !challengeMet && meetsChallenge(challenge.target, set)) lines.push({ icon: 'target', text: 'Défi réussi !' })
    if (lines.length > 0) setCheer((c) => ({ id: (c?.id ?? 0) + 1, lines }))
    dispatch({ type: 'completeSet', at: nowIso() })
  }
  const startEditing = (setIndex: number) => {
    const s = doneSets[setIndex - 1]
    const before = edited ? edited.before : { weightKg: live.weightKg, reps: live.reps }
    setEditing({ exerciseId: current.id, setIndex, before })
    dispatch({ type: 'load', weightKg: s.weightKg, reps: s.reps })
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <ModalBar
        tone="sport"
        onCancel={() => {
          // Aucune série faite : rien à garder (ouverte par erreur ou juste pour regarder). Sinon elle
          // occuperait le bouton principal de l'accueil.
          if (live.sets.length === 0) clear()
          navigate('/')
        }}
        cancelLabel="Fermer"
        cancelAria="Fermer"
        trailing={
          live.sets.length === 0 ? (
            <button type="button" onClick={clear} className="hit tap t-body py-2 text-sport">
              Changer
            </button>
          ) : undefined
        }
        title={
          <SessionTitle
            name={program?.name}
            step={`exo ${index + 1}/${exercises.length}`}
            elapsedMs={(now) => Math.max(0, now.getTime() - new Date(live.startedAt).getTime())}
          />
        }
      />

      <div key={current.id} className="animate-rise flex flex-col gap-1.5">
        <div>
          <h1 className="t-title1">{current.name}</h1>
          <p className="t-body text-muted tabular-nums">
            {reached ? (
              <>
                {targetSets}/{targetSets} séries <Icon name="check" className="text-sport" />
              </>
            ) : (
              `Série ${done + 1}/${targetSets} · objectif ${targetSets}×${current.targetReps}`
            )}
          </p>
        </div>
        {challenge && (
          <p className={`t-subhead mt-1 flex items-center gap-1.5 rounded-md px-3 py-2 font-semibold ${TONE.tint.sport}`}>
            <Icon name={challengeMet ? 'check' : 'target'} />
            {challengeMet
              ? "Défi réussi ! Validé à l'enregistrement"
              : `Défi : ${challenge.target.reps} reps ${challenge.target.weightKg === 0 ? 'au poids du corps' : `à ${formatWeight(challenge.target.weightKg)}`}`}
          </p>
        )}
      </div>

      {recent.length > 0 ? (
        <section className="flex flex-col gap-2 rounded-xl bg-surface px-4 py-3 shadow-card" aria-label="Tes dernières fois">
          <p className="t-footnote font-semibold text-muted uppercase">Tes dernières fois</p>
          {recent.map((r) => (
            <div key={r.day} className="t-subhead flex items-baseline gap-2">
              <span className="w-14 shrink-0 text-muted">{shortDate(r.day)}</span>
              <span className="flex flex-wrap gap-1">
                {r.sets.map((x) => (
                  <span key={x.setIndex} className="rounded-xs bg-fill px-1.5 py-0.5 tabular-nums">
                    {formatWeight(x.weightKg)} × {x.reps}
                  </span>
                ))}
              </span>
            </div>
          ))}
          {proposal.why && <p className="t-subhead border-t border-line pt-2">{proposal.why}</p>}
        </section>
      ) : (
        <p className="t-subhead text-muted">Première fois sur cet exo : choisis une charge confortable.</p>
      )}

      <div className="flex flex-col gap-4 rounded-2xl bg-surface p-4 shadow-card">
        <Stepper tone="sport" label="Charge" onMinus={() => dispatch({ type: 'weight', delta: -2.5 })} onPlus={() => dispatch({ type: 'weight', delta: 2.5 })}>
          <WeightInput
            aria-label="Charge (kg)"
            value={live.weightKg}
            onChange={(kg) => dispatch({ type: 'setWeight', weightKg: kg })}
            className="t-large min-h-11 w-full bg-transparent text-center tabular-nums outline-none"
          />
          <p className="t-footnote text-muted">{live.weightKg === 0 ? 'PDC' : 'kg'}</p>
        </Stepper>
        <Stepper tone="sport" label="Reps" onMinus={() => dispatch({ type: 'reps', delta: -1 })} onPlus={() => dispatch({ type: 'reps', delta: 1 })}>
          <p className="t-large tabular-nums" aria-label="Reps">
            {live.reps}
          </p>
        </Stepper>
      </div>

      <ol className="flex flex-wrap gap-2" aria-label="Séries">
        {Array.from({ length: boxes }, (_, i) => {
          const s = doneSets[i]
          // Record par rapport à l'historique : pastille dorée.
          const record = s ? isSportRecord(historySets, s) : false
          return (
            // Largeur de base, et jamais moins que le texte : trop de séries pour une ligne → la suite passe dessous.
            <li key={i} className="flex grow basis-19">
              {s ? (
                <button
                  type="button"
                  aria-label={`Modifier la série ${i + 1}`}
                  aria-pressed={edited?.setIndex === i + 1}
                  onClick={() => startEditing(i + 1)}
                  className={`tap-scale animate-pop t-subhead flex h-12 flex-1 items-center justify-center gap-1 rounded-full px-3 font-semibold whitespace-nowrap tabular-nums ${record ? 'bg-record text-on-record' : 'bg-sport text-on-sport'} ${edited?.setIndex === i + 1 ? 'ring-2 ring-sport ring-offset-2 ring-offset-bg' : ''}`}
                >
                  {record && <Icon name="trophy" />}
                  {/* Charge puis reps, comme dans l'historique et les records (« 4×8 » reste séries × reps). */}
                  <span>
                    {formatWeight(s.weightKg)} × {s.reps}
                  </span>
                </button>
              ) : (
                <span className="t-subhead flex h-12 flex-1 items-center justify-center rounded-full border-[1.5px] border-dashed border-faint text-muted tabular-nums">
                  {i + 1}
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {!edited && done > 0 && <p className="t-footnote -mt-3 text-muted">Touche une série faite pour la corriger.</p>}

      <RestTimer
        startedAt={live.restStartedAt ?? null}
        restSec={live.restSec ?? 0}
        // Séries visées faites : le bouton principal mène à l'exo suivant, le minuteur aussi.
        nextLabel={!reached ? `série ${done + 1}` : next ? next.name : 'fin de séance'}
        onAdd={() => dispatch({ type: 'restAdd' })}
        onSkip={() => dispatch({ type: 'restSkip' })}
      />

      <div className="mt-auto flex flex-col gap-2">
        {edited ? (
          <>
            <Button
              tone="sport"
              onClick={() => {
                dispatch({ type: 'updateSet', setIndex: edited.setIndex })
                stopEditing(true)
              }}
            >
              <Icon name="check" />
              Enregistrer la série {edited.setIndex}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" tone="sport" className="flex-1" onClick={() => stopEditing(true)}>
                Annuler
              </Button>
              <Button
                variant="ghost"
                tone="danger"
                className="flex-1"
                onClick={() => {
                  dispatch({ type: 'deleteSet', setIndex: edited.setIndex })
                  stopEditing(true)
                }}
              >
                Supprimer la série
              </Button>
            </div>
          </>
        ) : reached ? (
          <Button tone="sport" onClick={goNext}>
            {next ? `Exo suivant : ${next.name}` : 'Fin de séance'}
            <Icon name="chevron" />
          </Button>
        ) : (
          <Button tone="sport" onClick={completeSet}>
            <Icon name="check" />
            Série {done + 1} faite
          </Button>
        )}
        <div className={`flex gap-2 ${edited ? 'hidden' : ''}`}>
          {index > 0 && (
            <Button variant="ghost" tone="sport" onClick={goBack}>
              <Icon name="chevron" className="rotate-180" />
              Précédent
            </Button>
          )}
          {reached ? (
            <Button variant="ghost" tone="sport" className="flex-1" onClick={completeSet}>
              <Icon name="plus" />
              Série en plus
            </Button>
          ) : (
            <Button variant="secondary" tone="sport" className="flex-1" onClick={goNext}>
              {next ? 'Exo suivant' : 'Fin de séance'}
              <Icon name="chevron" />
            </Button>
          )}
        </div>
        {confirmAbandon ? (
          <div className="flex gap-2">
            <Button variant="ghost" tone="sport" className="flex-1" onClick={() => setConfirmAbandon(false)}>
              Continuer
            </Button>
            <Button variant="ghost" tone="danger" className="flex-1" onClick={abandon}>
              Oui, abandonner
            </Button>
          </div>
        ) : (
          <button type="button" className="hit tap t-subhead py-1.5 text-danger" onClick={() => setConfirmAbandon(true)}>
            Abandonner la séance
          </button>
        )}
      </div>

      {cheer && (
        <>
          <Fireworks key={cheer.id} size="small" />
          {/* Sur <body>, comme les feux d'artifice : au-dessus de l'écran animé, pas dedans. */}
          {createPortal(
            <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+--spacing(14))] z-40 flex justify-center px-4">
              <div key={cheer.id} role="status" className="animate-pop material rounded-xl border border-line px-5 py-3 text-center shadow-card">
                {cheer.lines.map((l) => (
                  <p key={l.text} className="t-headline flex items-center justify-center gap-1.5">
                    <Icon name={l.icon} className="text-sport" />
                    {l.text}
                  </p>
                ))}
              </div>
            </div>,
            document.body,
          )}
        </>
      )}
    </div>
  )
}

function ChooseProgram({ onStart, preferred }: { onStart: (s: LiveState) => void; preferred: string | null }) {
  const { data, v1 } = useAppData()
  const navigate = useNavigate()
  const programs = data.programs.filter((p) => !p.archived).sort((a, b) => a.position - b.position)
  const [picked, setPicked] = useState<string | null>(preferred)
  // Recalculée à chaque rendu : les programmes peuvent arriver après l'ouverture de l'écran.
  const selected = programs.find((p) => p.id === picked) ?? nextProgram(data.programs, data.sportSessions)
  const programId = selected?.id ?? null

  if (programs.length === 0) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-4 text-center">
        <Icon name="sport" size="3em" className="self-center text-sport" />
        <p className="t-title3">Pas encore de programme.</p>
        <Link to="/bibliotheque?vue=modeles" className={`tap-scale t-headline rounded-lg px-4 py-3.5 ${TONE.solid.sport}`}>
          Créer ton programme
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <ModalBar tone="sport" onCancel={() => navigate('/')} cancelAria="Fermer" />
      <h1 className="t-title1">Quelle séance ?</h1>
      <div className="rows overflow-hidden rounded-md bg-surface" role="group" aria-label="Séances">
        {programs.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === programId}
            aria-label={p.name}
            aria-describedby={`prog-${p.id}`}
            onClick={() => setPicked(p.id)}
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
              className={`flex size-5.5 shrink-0 items-center justify-center rounded-full ${p.id === programId ? TONE.solid.sport : 'border-[1.5px] border-faint'}`}
            >
              {p.id === programId && <Icon name="check" size="0.85em" />}
            </span>
          </button>
        ))}
      </div>
      <Button tone="sport" className="mt-auto" disabled={!selected} onClick={() => selected && onStart(newLive(selected, tracking(v1)))}>
        <Icon name="play" />
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
  const [note, setNote] = useState('')
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
        ...noteOf(note),
      })
      onDone()
      navigate('/xp', { replace: true, state: { result, domain: 'sport', logId: live.id, momentDay: todayParis(new Date(live.startedAt)) } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {onBack ? <ModalBar tone="sport" onCancel={onBack} back cancelLabel="Dernier exo" cancelAria="Revenir au dernier exo" /> : <div className="h-11" />}
      <div className="animate-rise">
        <h1 className="t-title1">Séance terminée</h1>
        <p className="t-body text-muted">
          {live.sets.length} série{live.sets.length > 1 ? 's' : ''} enregistrée{live.sets.length > 1 ? 's' : ''}
        </p>
      </div>
      <label className="flex items-center gap-3 rounded-md bg-surface px-4 py-2">
        <span className="t-body flex-1">Durée</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_DURATION}
          aria-label="Durée en minutes"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="t-title3 w-24 bg-transparent text-right tabular-nums outline-none placeholder:text-muted"
          placeholder="—"
        />
        <span className="t-body text-muted">min</span>
      </label>
      <SessionFeedback tone="sport" flow={flow} desire={desire} note={note} onFlow={setFlow} onDesire={setDesire} onNote={setNote} />
      {error && (
        <p role="alert" className="t-subhead text-danger">
          {error}
        </p>
      )}
      {noSets && <p className="t-subhead text-muted">Aucune série cochée : rien à enregistrer. Reviens à l'exo ou abandonne la séance.</p>}
      <div className="mt-auto flex flex-col gap-2">
        <Button tone="sport" disabled={noSets || !validDuration || flow === null || desire === null || saving} onClick={finish}>
          Terminer
        </Button>
        {confirmAbandon ? (
          <Button variant="ghost" tone="danger" onClick={onAbandon}>
            Oui, abandonner (rien n'est enregistré)
          </Button>
        ) : (
          <Button variant="ghost" tone="danger" onClick={() => setConfirmAbandon(true)}>
            Abandonner la séance
          </Button>
        )}
      </div>
    </div>
  )
}
