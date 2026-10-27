import { useEffect, useState } from 'react'
import { getExercise } from '../../content/exercises'
import { PATH, type Skill } from '../../content/guitar'
import { tempoProposal, type Attempt, type SkillProgress } from '../../domain/guitar/engine'
import { Button } from '../../ui/Button'
import { Stepper } from '../../ui/Stepper'
import { Switch } from '../../ui/Switch'
import { Metronome } from '../exercise/Metronome'

export type RawAttempt = Omit<Attempt, 'passed'>

/** Mesure de la compétence (§5) : tempo propre, compteur « une minute », checklist, score de quiz, bends, grille. */
export function Measure({ skill, own, day, onAttempt }: { skill: Skill; own: SkillProgress | undefined; day: string; onAttempt: (a: RawAttempt) => void }) {
  const v = skill.validation
  switch (v.kind) {
    case 'tempo':
      return <TempoMeasure skill={skill} own={own} day={day} onAttempt={onAttempt} />
    case 'changes_per_minute':
      return <Counter day={day} onAttempt={onAttempt} />
    case 'checklist':
      return <Checklist items={v.items} day={day} onAttempt={onAttempt} />
    case 'quiz':
      return <QuizScore withTime={v.maxSecondsPerItem !== undefined} day={day} onAttempt={onAttempt} />
    case 'pitch':
      return <Pitch total={v.hitsOutOf[1]} day={day} onAttempt={onAttempt} />
    case 'recording':
      return <Grid rubricId={v.rubricId} day={day} onAttempt={onAttempt} />
  }
}

function TempoMeasure({ skill, own, day, onAttempt }: { skill: Skill; own: SkillProgress | undefined; day: string; onAttempt: (a: RawAttempt) => void }) {
  const v = skill.validation as Extract<Skill['validation'], { kind: 'tempo' }>
  const ex = getExercise(v.exerciseId)
  const proposal = tempoProposal(skill, own)!
  const [bpm, setBpm] = useState(proposal.bpm)
  const [clean, setClean] = useState(false)
  if (!ex) return null
  return (
    <div className="flex flex-col gap-3">
      <p className="t-footnote text-muted">{proposal.why}</p>
      <Metronome
        key={ex.id}
        pattern={ex.pattern}
        best={own?.best ?? null}
        startBpm={ex.startBpm}
        startAt={proposal.bpm}
        targetBpm={v.bpm}
        challengeBpm={null}
        onTempo={setBpm}
      />
      <div className="flex items-center justify-between gap-3 rounded-xl bg-inset px-4 py-3">
        <span className="t-subhead">Propre à {bpm} bpm</span>
        <Switch label="Propre" checked={clean} onChange={setClean} />
      </div>
      <Button tone="guitar" onClick={() => onAttempt({ day, value: bpm, clean })}>
        Noter l’essai
      </Button>
    </div>
  )
}

/** 60 secondes, un gros bouton pour chaque changement propre. */
function Counter({ day, onAttempt }: { day: string; onAttempt: (a: RawAttempt) => void }) {
  const [left, setLeft] = useState<number | null>(null)
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (left === null || left <= 0) return
    const t = setTimeout(() => setLeft(left - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  if (left === null)
    return (
      <Button tone="guitar" onClick={() => (setLeft(60), setCount(0))}>
        Démarrer 60 secondes
      </Button>
    )
  if (left > 0)
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="t-large tabular-nums" role="timer">
          {left} s
        </p>
        <button
          type="button"
          onClick={() => setCount(count + 1)}
          aria-label="Un changement propre"
          className="tap-scale t-title1 flex h-40 w-full flex-col items-center justify-center rounded-3xl bg-guitar text-on-guitar shadow-card"
        >
          <span className="tabular-nums">{count}</span>
          <span className="t-subhead">changements propres</span>
        </button>
      </div>
    )
  return (
    <div className="flex flex-col gap-2 text-center">
      <p className="t-title2">{count} changements en 60 s</p>
      <Button tone="guitar" onClick={() => (onAttempt({ day, value: count }), setLeft(null))}>
        Noter l’essai
      </Button>
      <Button variant="ghost" tone="guitar" onClick={() => setLeft(null)}>
        Refaire
      </Button>
    </div>
  )
}

function Checklist({ items, day, onAttempt }: { items: string[]; day: string; onAttempt: (a: RawAttempt) => void }) {
  const [ticked, setTicked] = useState<string[]>([])
  const all = ticked.length === items.length
  return (
    <div className="flex flex-col gap-2">
      <ul className="rows overflow-hidden rounded-xl bg-inset">
        {items.map((it) => (
          <li key={it}>
            <label className="tap flex items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={ticked.includes(it)}
                onChange={(e) => setTicked(e.target.checked ? [...ticked, it] : ticked.filter((x) => x !== it))}
                className="size-5 accent-guitar"
              />
              <span className="t-subhead">{it}</span>
            </label>
          </li>
        ))}
      </ul>
      <Button tone="guitar" onClick={() => onAttempt({ day, value: ticked.length, clean: all })}>
        Noter l’essai{all ? '' : ` (${ticked.length}/${items.length})`}
      </Button>
    </div>
  )
}

/** Score saisi à la main ; les entraîneurs qui le calculent arrivent au lot G3. */
function QuizScore({ withTime, day, onAttempt }: { withTime: boolean; day: string; onAttempt: (a: RawAttempt) => void }) {
  const [score, setScore] = useState(80)
  const [seconds, setSeconds] = useState(3)
  return (
    <div className="flex flex-col gap-3">
      <Stepper tone="guitar" label="Score" onMinus={() => setScore(Math.max(0, score - 5))} onPlus={() => setScore(Math.min(100, score + 5))}>
        <span className="t-large tabular-nums">{score} %</span>
      </Stepper>
      {withTime && (
        <Stepper tone="guitar" label="Secondes par question" onMinus={() => setSeconds(Math.max(0.5, seconds - 0.5))} onPlus={() => setSeconds(seconds + 0.5)}>
          <span className="t-title2 tabular-nums">{seconds} s</span>
        </Stepper>
      )}
      <p className="t-footnote text-muted">Saisis ton résultat : les entraîneurs de manche et d’oreille arrivent bientôt.</p>
      <Button tone="guitar" onClick={() => onAttempt({ day, value: score, ...(withTime ? { seconds } : {}) })}>
        Noter l’essai
      </Button>
    </div>
  )
}

function Pitch({ total, day, onAttempt }: { total: number; day: string; onAttempt: (a: RawAttempt) => void }) {
  const [hits, setHits] = useState(0)
  return (
    <div className="flex flex-col gap-3">
      <Stepper tone="guitar" label="Bends justes" onMinus={() => setHits(Math.max(0, hits - 1))} onPlus={() => setHits(Math.min(total, hits + 1))}>
        <span className="t-large tabular-nums">
          {hits} sur {total}
        </span>
      </Stepper>
      <p className="t-footnote text-muted">Vérifie chaque bend avec l’accordeur (±15 cents).</p>
      <Button tone="guitar" onClick={() => onAttempt({ day, value: hits })}>
        Noter l’essai
      </Button>
    </div>
  )
}

/** Grille de 5 critères de 1 à 3, sur un enregistrement réécouté. Auto-évaluation : l’appli ne t’entend pas. */
function Grid({ rubricId, day, onAttempt }: { rubricId: string; day: string; onAttempt: (a: RawAttempt) => void }) {
  const criteria = PATH.rubrics.find((r) => r.id === rubricId)?.criteria ?? []
  const [marks, setMarks] = useState<number[]>(() => criteria.map(() => 2))
  const avg = marks.reduce((t, x) => t + x, 0) / Math.max(1, marks.length)
  return (
    <div className="flex flex-col gap-2">
      <p className="t-footnote text-muted">Enregistre-toi, réécoute, puis note honnêtement : c’est ton jugement, pas celui de l’appli.</p>
      {criteria.map((c, i) => (
        <div key={c.label} role="group" aria-label={c.label} className="flex items-center justify-between gap-3">
          <span className="t-subhead">{c.label}</span>
          <span className="flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={marks[i] === n}
                onClick={() => setMarks(marks.map((m, j) => (j === i ? n : m)))}
                className={`tap size-11 rounded-md font-semibold tabular-nums ${marks[i] === n ? 'bg-guitar text-on-guitar' : 'bg-inset'}`}
              >
                {n}
              </button>
            ))}
          </span>
        </div>
      ))}
      <Button tone="guitar" onClick={() => onAttempt({ day, value: Math.round(avg * 10) / 10 })}>
        Noter la prise ({avg.toFixed(1)})
      </Button>
    </div>
  )
}
