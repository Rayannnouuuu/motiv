import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getExercise } from '../../content/exercises'
import { getSkill } from '../../content/guitar'
import { useActions, useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { weekStart } from '../../domain/date'
import { beginnerMinutes, EMPTY_PROGRESS, recordAttempt, type GuitarProgress } from '../../domain/guitar/engine'
import { DURATIONS, ensureLearning, generateSession, weekFocus, type Duration, type SessionBlock, type SessionPlan } from '../../domain/guitar/session'
import { Button } from '../../ui/Button'
import { SessionBar, Segments } from '../../ui/SessionBar'
import { Metronome } from '../exercise/Metronome'
import { useRun } from '../settings/useRun'
import { Measure, type RawAttempt } from './Measure'

const BLOCK_LABEL = { warmup: 'Échauffement', focus: 'Focus', maintenance: 'Entretien', repertoire: 'Répertoire', bonus: 'Bonus' } as const
const clock = (sec: number) => `${Math.floor(Math.abs(sec) / 60)}:${String(Math.abs(sec) % 60).padStart(2, '0')}`

interface Done {
  skillId: string
  passed: boolean
  name: string
  value: number
}

/** Minuteur du bloc en cours : le temps qui reste, puis le dépassement. */
function BlockTimer({ minutes }: { minutes: number }) {
  const [sec, setSec] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSec((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const left = minutes * 60 - sec
  return (
    <span role="timer" aria-label="Minuteur du bloc" className={`t-title2 tabular-nums ${left < 0 ? 'text-muted' : 'text-guitar'}`}>
      {left < 0 ? '+' : ''}
      {clock(left)}
    </span>
  )
}

/** Séance guidée (lot G2) : je choisis la durée, l'appli construit les blocs, mesure, puis bilan et log. */
export function GuidedSessionPage() {
  const { v1, data, today } = useAppData()
  const { saveGuitarState } = useActions()
  const navigate = useNavigate()
  const { busy, error, run } = useRun()
  const g = v1.profile.guitar
  const progress = g?.progress ?? EMPTY_PROGRESS
  const first = data.guitarSessions.map((s) => s.day).sort()[0] ?? null
  const beginner = beginnerMinutes(first ?? today, today)
  const [duration, setDuration] = useState<Duration>(beginner ? 15 : 30)
  const [started, setStarted] = useState<Date | null>(null)
  const [step, setStep] = useState(0)
  const [done, setDone] = useState<Done[]>([])
  const [ticked, setTicked] = useState(false)
  const [stuck, setStuck] = useState('')
  // Progression et focus locaux : chaque essai part du dernier état écrit.
  const [prog, setProg] = useState<GuitarProgress>(progress)
  const [focus, setFocus] = useState(g?.focus)
  const [plan, setPlan] = useState<SessionPlan | null>(null)
  const blocks = plan?.blocks ?? []
  const block: SessionBlock | undefined = blocks[step]

  const save = (next: GuitarProgress, nextFocus = focus) => run(() => saveGuitarState({ progress: next, ...(nextFocus ? { focus: nextFocus } : {}) }))

  const start = () => {
    const ready = ensureLearning(progress, today)
    const id = weekFocus(ready, focus, today)
    const nextFocus = id ? { week: weekStart(today), skillId: id } : focus
    void save(ready, nextFocus).then((ok) => {
      if (!ok) return
      setProg(ready)
      setFocus(nextFocus)
      setPlan(generateSession({ duration, progress: ready, focus: nextFocus, today, songs: v1.songs }))
      setStarted(new Date())
    })
  }

  const attempt = (b: SessionBlock, a: RawAttempt) => {
    if (!b.skillId) return
    const before = prog.skills[b.skillId]?.status
    const next = recordAttempt(prog, b.skillId, a)
    const skill = getSkill(b.skillId)!
    const last = next.skills[b.skillId].attempts.at(-1)!
    const validated = before === 'learning' && next.skills[b.skillId].status === 'validated'
    setDone((d) => [
      ...d,
      { skillId: b.skillId!, passed: last.passed, name: skill.name, value: a.value },
      ...(validated ? [{ skillId: b.skillId!, passed: true, name: `Validée : ${skill.name}`, value: -1 }] : []),
    ])
    setProg(next)
    void save(next)
  }

  const finish = () => {
    const minutes = Math.max(1, Math.round((Date.now() - (started?.getTime() ?? Date.now())) / 60_000))
    const exercises = [
      ...(blocks[0]?.exerciseId ? [{ kind: 'exercise', exerciseId: blocks[0].exerciseId, bpm: String(blocks[0].bpm ?? '') }] : []),
      ...blocks.flatMap((b) => {
        const v = b.skillId ? getSkill(b.skillId)?.validation : undefined
        const tried = v?.kind === 'tempo' ? done.filter((d) => d.skillId === b.skillId && d.value > 0).at(-1) : undefined
        return tried && v?.kind === 'tempo' && getExercise(v.exerciseId) ? [{ kind: 'exercise', exerciseId: v.exerciseId, bpm: String(tried.value) }] : []
      }),
      ...(ticked && blocks.find((b) => b.kind === 'repertoire')?.songId
        ? [{ kind: 'song', songId: blocks.find((b) => b.kind === 'repertoire')!.songId!, mastered: false }]
        : []),
    ]
    navigate('/log/guitare', {
      state: { durationMin: minutes, step: 2, day: today, entries: exercises, ...(stuck.trim() ? { note: `Ce qui coince : ${stuck.trim()}` } : {}) },
    })
  }

  const quit = (
    <SessionBar
      name="Séance guidée"
      step={!started ? undefined : block ? `${BLOCK_LABEL[block.kind]} · ${step + 1}/${blocks.length}` : 'Bilan'}
      quitLabel="Fermer"
      onQuit={() => navigate('/')}
    />
  )

  if (!started)
    return (
      <div className="flex flex-1 flex-col gap-6">
        {quit}
        <div>
          <p className="t-overline text-guitar">Guitare</p>
          <h1 className="t-title1 mt-1">Combien de temps ?</h1>
          {beginner && (
            <p className="t-subhead mt-2 text-muted">
              Les 3 premières semaines, 15 à 20 minutes suffisent. Une douleur au bout des doigts est normale au début ; au poignet ou à l’avant-bras,
              arrête-toi et vérifie ta posture.
            </p>
          )}
        </div>
        <div role="group" aria-label="Durée" className="grid grid-cols-4 gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={duration === d}
              onClick={() => setDuration(d)}
              className={`tap t-title2 min-h-16 rounded-xl font-semibold tabular-nums ${duration === d ? 'bg-guitar text-on-guitar' : 'bg-surface border border-line'}`}
            >
              {d}
              <span className="t-footnote block font-normal">min</span>
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="t-footnote text-danger">
            {error}
          </p>
        )}
        <Button tone="guitar" className="mt-auto" disabled={busy} onClick={start}>
          <Icon name="play" />
          Construire ma séance
        </Button>
      </div>
    )

  if (step >= blocks.length) {
    const obj = plan?.objective
    const reached = obj ? done.some((d) => d.skillId === obj.skillId && (d.passed || (obj.target !== null && d.value >= obj.target))) : null
    return (
      <div className="flex flex-1 flex-col gap-5">
        {quit}
        <h1 className="t-title1">Bilan de la séance</h1>
        {obj && (
          <p role="status" className={`t-callout rounded-xl px-4 py-3 font-semibold ${reached ? 'bg-guitar/12 text-guitar' : 'bg-inset'}`}>
            {reached ? 'Objectif atteint' : 'Objectif pas encore atteint'} · {obj.text}
          </p>
        )}
        {done.length > 0 && (
          <ul className="rows overflow-hidden rounded-xl border border-line bg-surface">
            {done.map((d, i) => (
              <li key={i} className="t-subhead flex items-center justify-between gap-3 px-4 py-2.5">
                <span>{d.name}</span>
                {d.value >= 0 && <span className={d.passed ? 'font-semibold text-guitar' : 'text-muted'}>{d.passed ? 'Réussi' : 'À refaire'}</span>}
              </li>
            ))}
          </ul>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="t-headline">Ce qui coince</span>
          <input
            value={stuck}
            onChange={(e) => setStuck(e.target.value)}
            maxLength={140}
            placeholder="Une phrase, ou rien"
            className="t-body min-h-11 rounded-md border border-line bg-surface px-4 outline-none placeholder:text-muted"
          />
        </label>
        <Button tone="guitar" className="mt-auto" onClick={finish}>
          Noter la séance
        </Button>
      </div>
    )
  }

  const skill = block.skillId ? getSkill(block.skillId) : undefined
  const ex = block.exerciseId ? getExercise(block.exerciseId) : undefined
  return (
    <div className="flex flex-1 flex-col gap-5 pb-4">
      {quit}
      <Segments tone="guitar" parts={blocks.map((_, i) => (i < step ? 1 : 0))} current={step} label={`Bloc ${step + 1} sur ${blocks.length}`} />
      {step === 0 && plan?.objective && (
        <p className="t-callout rounded-xl bg-guitar/12 px-4 py-3 font-semibold text-guitar">Objectif : {plan.objective.text}</p>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="t-overline text-guitar">
            {BLOCK_LABEL[block.kind]} · {block.minutes} min
          </p>
          <h2 className="t-title2 mt-1">{block.title}</h2>
        </div>
        <BlockTimer key={step} minutes={block.minutes} />
      </div>
      {block.hint && <p className="t-subhead text-muted">{block.hint}</p>}

      {block.kind === 'warmup' && ex && (
        <Metronome key={ex.id} pattern={ex.pattern} best={null} startBpm={ex.startBpm} startAt={block.bpm} targetBpm={ex.targetBpm} challengeBpm={null} />
      )}
      {skill && <Measure key={`${skill.id}-${step}`} skill={skill} own={prog.skills[skill.id]} day={today} onAttempt={(a) => attempt(block, a)} />}
      {block.kind === 'repertoire' && block.songId && (
        <label className="tap flex items-center gap-3 rounded-xl bg-inset px-4 py-3">
          <input type="checkbox" checked={ticked} onChange={(e) => setTicked(e.target.checked)} className="size-5 accent-guitar" />
          <span className="t-subhead">Section jouée</span>
        </label>
      )}

      <Button tone="guitar" variant="secondary" className="mt-auto" onClick={() => setStep(step + 1)}>
        {step === blocks.length - 1 ? 'Terminer' : 'Bloc suivant'}
      </Button>
    </div>
  )
}
