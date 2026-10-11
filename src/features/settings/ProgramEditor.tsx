import { useState } from 'react'
import { useActions, useAppData } from '../../data/AppDataContext'
import type { Program, ProgramExercise } from '../../domain/types'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { useRun } from './useRun'

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position
const input = 'rounded-lg border border-line bg-bg px-2 py-1'

/** Échange l'élément `i` avec son voisin et renvoie ceux dont la position a changé. */
function move<T extends { position: number }>(items: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (j < 0 || j >= items.length) return []
  const order = [...items]
  ;[order[i], order[j]] = [order[j], order[i]]
  return order.flatMap((it, k) => (it.position === k ? [] : [{ ...it, position: k }]))
}

function ExerciseForm({ onAdd }: { onAdd: (e: { name: string; targetSets: number; targetReps: number }) => void }) {
  const [name, setName] = useState('')
  const [sets, setSets] = useState('4')
  const [reps, setReps] = useState('8')
  const s = Number(sets)
  const r = Number(reps)
  const valid = name.trim() !== '' && Number.isInteger(s) && s > 0 && Number.isInteger(r) && r > 0
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input aria-label="Nom de l'exo" placeholder="Nouvel exo" value={name} onChange={(e) => setName(e.target.value)} className={`${input} min-w-0 flex-1`} />
      <input aria-label="Séries" inputMode="numeric" value={sets} onChange={(e) => setSets(e.target.value)} className={`${input} w-12 text-center`} />
      <span className="text-muted">×</span>
      <input aria-label="Reps" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} className={`${input} w-12 text-center`} />
      <button
        type="button"
        aria-label="Ajouter l'exo"
        disabled={!valid}
        className="font-semibold text-accent disabled:opacity-40"
        onClick={() => {
          onAdd({ name: name.trim(), targetSets: s, targetReps: r })
          setName('')
        }}
      >
        Ajouter
      </button>
    </div>
  )
}

function ExerciseRow({ ex, first, last, onSave, onMove }: { ex: ProgramExercise; first: boolean; last: boolean; onSave: (e: ProgramExercise) => void; onMove: (dir: -1 | 1) => void }) {
  const [name, setName] = useState(ex.name)
  return (
    <li className="flex items-center gap-2">
      <input
        aria-label={`Nom · ${ex.name}`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name.trim() !== ex.name && onSave({ ...ex, name: name.trim() })}
        className={`${input} min-w-0 flex-1`}
      />
      <span className="text-sm text-muted tabular-nums">
        {ex.targetSets}×{ex.targetReps}
      </span>
      <button type="button" aria-label={`Monter ${ex.name}`} disabled={first} className="px-1 disabled:opacity-30" onClick={() => onMove(-1)}>
        ↑
      </button>
      <button type="button" aria-label={`Descendre ${ex.name}`} disabled={last} className="px-1 disabled:opacity-30" onClick={() => onMove(1)}>
        ↓
      </button>
      <button type="button" aria-label={`Supprimer ${ex.name}`} className="px-1 text-danger" onClick={() => onSave({ ...ex, archived: true })}>
        ✕
      </button>
    </li>
  )
}

function ProgramCard({ program, first, last, onSave, onMove }: { program: Program; first: boolean; last: boolean; onSave: (p: Program) => void; onMove: (dir: -1 | 1) => void }) {
  const [name, setName] = useState(program.name)
  const active = program.exercises.filter((e) => !e.archived).sort(byPosition)
  const withExercises = (changed: ProgramExercise[]) =>
    onSave({ ...program, exercises: program.exercises.map((e) => changed.find((c) => c.id === e.id) ?? e) })

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          aria-label={`Nom de la séance · ${program.name}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name.trim() !== program.name && onSave({ ...program, name: name.trim() })}
          className={`${input} min-w-0 flex-1 font-semibold`}
        />
        <button type="button" aria-label={`Monter ${program.name}`} disabled={first} className="px-1 disabled:opacity-30" onClick={() => onMove(-1)}>
          ↑
        </button>
        <button type="button" aria-label={`Descendre ${program.name}`} disabled={last} className="px-1 disabled:opacity-30" onClick={() => onMove(1)}>
          ↓
        </button>
        <button type="button" aria-label={`Supprimer ${program.name}`} className="px-1 text-danger" onClick={() => onSave({ ...program, archived: true })}>
          ✕
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {active.map((ex, i) => (
          <ExerciseRow
            key={ex.id}
            ex={ex}
            first={i === 0}
            last={i === active.length - 1}
            onSave={(e) => withExercises([e])}
            onMove={(dir) => withExercises(move(active, i, dir))}
          />
        ))}
      </ul>
      <ExerciseForm
        onAdd={(e) =>
          onSave({
            ...program,
            exercises: [
              ...program.exercises,
              { id: crypto.randomUUID(), programId: program.id, position: Math.max(-1, ...program.exercises.map((x) => x.position)) + 1, archived: false, ...e },
            ],
          })
        }
      />
    </Card>
  )
}

function NewProgram({ position, onCreate }: { position: number; onCreate: (p: Program) => void }) {
  const [id] = useState(() => crypto.randomUUID())
  const [name, setName] = useState('')
  const [exercises, setExercises] = useState<ProgramExercise[]>([])
  return (
    <Card className="flex flex-col gap-3">
      <input aria-label="Nom de la nouvelle séance" placeholder="Nouvelle séance (ex. Haut)" value={name} onChange={(e) => setName(e.target.value)} className={input} />
      {exercises.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {exercises.map((e) => (
            <li key={e.id}>
              {e.name} · {e.targetSets}×{e.targetReps}
            </li>
          ))}
        </ul>
      )}
      <ExerciseForm onAdd={(e) => setExercises([...exercises, { id: crypto.randomUUID(), programId: id, position: exercises.length, archived: false, ...e }])} />
      <Button disabled={name.trim() === ''} onClick={() => onCreate({ id, name: name.trim(), position, archived: false, exercises })}>
        Créer la séance
      </Button>
    </Card>
  )
}

export function ProgramEditor() {
  const { data } = useAppData()
  const { saveProgram } = useActions()
  const { busy, error, run } = useRun()
  const [formKey, setFormKey] = useState(0)
  const programs = data.programs.filter((p) => !p.archived).sort(byPosition)
  const nextPosition = Math.max(-1, ...data.programs.map((p) => p.position)) + 1

  const save = (...ps: Program[]) =>
    run(async () => {
      for (const p of ps) await saveProgram(p)
    })

  return (
    <section className="flex flex-col gap-3" aria-busy={busy}>
      <h2 className="text-lg font-semibold">Programme sport</h2>
      {programs.map((p, i) => (
        <ProgramCard key={p.id} program={p} first={i === 0} last={i === programs.length - 1} onSave={(x) => save(x)} onMove={(dir) => save(...move(programs, i, dir))} />
      ))}
      <NewProgram
        key={formKey}
        position={nextPosition}
        onCreate={(p) => {
          void save(p)
          setFormKey(formKey + 1)
        }}
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  )
}
