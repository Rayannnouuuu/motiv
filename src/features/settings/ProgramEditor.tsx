import { useState } from 'react'
import { useActions, useAppData } from '../../data/AppDataContext'
import type { Program, ProgramExercise } from '../../domain/types'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { PresetPicker } from './PresetPicker'
import { useRun } from './useRun'

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position
const input = 'rounded-lg border border-line bg-bg px-2 py-1.5'

/** Échange l'élément `i` avec son voisin et renvoie ceux dont la position a changé. */
function move<T extends { position: number }>(items: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (j < 0 || j >= items.length) return []
  const order = [...items]
  ;[order[i], order[j]] = [order[j], order[i]]
  return order.flatMap((it, k) => (it.position === k ? [] : [{ ...it, position: k }]))
}

const positiveInt = (v: number) => Number.isInteger(v) && v > 0

/** Édition d'une séance sur un brouillon : rien n'est enregistré avant « Enregistrer ». */
function SessionEditor({ initial, isNew, onSave, onCancel, onDelete }: {
  initial: Program
  isNew: boolean
  onSave: (p: Program) => Promise<void>
  onCancel: () => void
  onDelete: () => Promise<void>
}) {
  const [draft, setDraft] = useState(initial)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const visible = draft.exercises.filter((e) => !e.archived).sort(byPosition)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const valid = draft.name.trim() !== '' && visible.every((e) => e.name.trim() !== '' && positiveInt(e.targetSets) && positiveInt(e.targetReps))

  const setExercise = (id: string, patch: Partial<ProgramExercise>) =>
    setDraft((d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
  const reorder = (i: number, dir: -1 | 1) => {
    const changed = move(visible, i, dir)
    setDraft((d) => ({ ...d, exercises: d.exercises.map((e) => changed.find((c) => c.id === e.id) ?? e) }))
  }
  const remove = (ex: ProgramExercise) => {
    const known = initial.exercises.some((e) => e.id === ex.id)
    // Un exo déjà enregistré est archivé (son historique reste lisible) ; un nouveau disparaît.
    setDraft((d) => ({ ...d, exercises: known ? d.exercises.map((e) => (e.id === ex.id ? { ...e, archived: true } : e)) : d.exercises.filter((e) => e.id !== ex.id) }))
  }
  const addExercise = () =>
    setDraft((d) => ({
      ...d,
      exercises: [
        ...d.exercises,
        { id: crypto.randomUUID(), programId: d.id, name: '', targetSets: 3, targetReps: 10, position: Math.max(-1, ...d.exercises.map((e) => e.position)) + 1, archived: false },
      ],
    }))

  async function save() {
    setBusy(true)
    try {
      // Positions recalées 0, 1, 2… dans l'ordre affiché.
      const order = new Map(visible.map((e, k) => [e.id, k]))
      await onSave({ ...draft, name: draft.name.trim(), exercises: draft.exercises.map((e) => ({ ...e, name: e.name.trim(), position: order.get(e.id) ?? e.position })) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3 border-accent">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Nom de la séance</span>
        <input aria-label="Nom de la séance" placeholder="ex. Haut" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={`${input} font-semibold`} />
      </label>

      {visible.length > 0 && (
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-2 gap-y-2 text-sm">
          <span className="text-xs text-muted">Exo</span>
          <span className="w-12 text-center text-xs text-muted">Séries</span>
          <span className="w-12 text-center text-xs text-muted">Reps</span>
          <span />
          {visible.map((ex, i) => {
            const label = ex.name || `exo ${i + 1}`
            return (
              <div key={ex.id} className="contents">
                <input aria-label={`Nom · exo ${i + 1}`} placeholder="Nom de l'exo" value={ex.name} onChange={(e) => setExercise(ex.id, { name: e.target.value })} className={`${input} min-w-0`} />
                <input
                  aria-label={`Séries · ${label}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={ex.targetSets || ''}
                  onChange={(e) => setExercise(ex.id, { targetSets: Number(e.target.value) })}
                  className={`${input} w-12 text-center tabular-nums`}
                />
                <input
                  aria-label={`Reps · ${label}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={ex.targetReps || ''}
                  onChange={(e) => setExercise(ex.id, { targetReps: Number(e.target.value) })}
                  className={`${input} w-12 text-center tabular-nums`}
                />
                <div className="flex">
                  <button type="button" aria-label={`Monter ${label}`} disabled={i === 0} className="px-1 disabled:opacity-30" onClick={() => reorder(i, -1)}>
                    ↑
                  </button>
                  <button type="button" aria-label={`Descendre ${label}`} disabled={i === visible.length - 1} className="px-1 disabled:opacity-30" onClick={() => reorder(i, 1)}>
                    ↓
                  </button>
                  <button type="button" aria-label={`Retirer ${label}`} className="px-1 text-danger" onClick={() => remove(ex)}>
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <button type="button" className="self-start text-sm font-semibold text-accent" onClick={addExercise}>
        + Ajouter un exo
      </button>

      <div className="flex gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button className="flex-1" disabled={!dirty || !valid || busy} onClick={save}>
          Enregistrer
        </Button>
      </div>

      {!isNew &&
        (confirmDelete ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="flex-1">Supprimer « {initial.name} » ? L'historique est gardé.</span>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Non
            </Button>
            <Button className="bg-danger" onClick={() => void onDelete()}>
              Supprimer
            </Button>
          </div>
        ) : (
          <button type="button" className="self-start text-sm text-danger" onClick={() => setConfirmDelete(true)}>
            Supprimer la séance
          </button>
        ))}
    </Card>
  )
}

export function ProgramEditor() {
  const { data } = useAppData()
  const { saveProgram } = useActions()
  const { busy, error, run } = useRun()
  const [editing, setEditing] = useState<Program | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [showPresets, setShowPresets] = useState(false)
  const programs = data.programs.filter((p) => !p.archived).sort(byPosition)
  const nextPosition = Math.max(-1, ...data.programs.map((p) => p.position)) + 1
  const isNew = editing !== null && !data.programs.some((p) => p.id === editing.id)

  const save = (...ps: Program[]) =>
    run(async () => {
      for (const p of ps) await saveProgram(p)
    })

  const editor = (p: Program) => (
    <SessionEditor
      key={p.id}
      initial={p}
      isNew={isNew}
      onCancel={() => setEditing(null)}
      onSave={async (x) => {
        // En cas d'erreur, le brouillon reste ouvert.
        if (!(await save(x))) return
        setEditing(null)
        setSaved(x.name)
      }}
      onDelete={async () => {
        if (await save({ ...p, archived: true })) setEditing(null)
      }}
    />
  )

  return (
    <section className="flex flex-col gap-3" aria-busy={busy}>
      <h2 className="text-lg font-semibold">Programme sport</h2>

      {programs.length === 0 ? (
        <>
          <p className="text-sm text-muted">Choisis un programme tout fait, ou crée tes séances.</p>
          <PresetPicker />
        </>
      ) : (
        <p className="text-sm text-muted">Les séances s'enchaînent dans cet ordre.</p>
      )}

      {programs.map((p, i) =>
        editing?.id === p.id ? (
          editor(editing)
        ) : (
          <Card key={p.id} className="flex items-center gap-2 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.name}</p>
              <p className="truncate text-xs text-muted">
                {p.exercises
                  .filter((e) => !e.archived)
                  .sort(byPosition)
                  .map((e) => `${e.name} ${e.targetSets}×${e.targetReps}`)
                  .join(' · ') || 'Aucun exo'}
              </p>
            </div>
            <button type="button" aria-label={`Monter ${p.name}`} disabled={i === 0 || busy} className="px-1 disabled:opacity-30" onClick={() => save(...move(programs, i, -1))}>
              ↑
            </button>
            <button type="button" aria-label={`Descendre ${p.name}`} disabled={i === programs.length - 1 || busy} className="px-1 disabled:opacity-30" onClick={() => save(...move(programs, i, 1))}>
              ↓
            </button>
            <Button variant="secondary" className="px-3 py-1.5 text-sm" disabled={editing !== null} onClick={() => setEditing(p)} aria-label={`Modifier ${p.name}`}>
              Modifier
            </Button>
          </Card>
        ),
      )}

      {isNew && editing && editor(editing)}

      {saved && !editing && <p className="text-sm text-guitar">« {saved} » enregistrée ✓</p>}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {!editing && (
        <Button
          variant="secondary"
          onClick={() => {
            setSaved(null)
            setEditing({ id: crypto.randomUUID(), name: '', position: nextPosition, archived: false, exercises: [] })
          }}
        >
          + Nouvelle séance
        </Button>
      )}

      {programs.length > 0 && (
        <div className="flex flex-col gap-2">
          <button type="button" aria-expanded={showPresets} className="self-start text-sm text-muted underline" onClick={() => setShowPresets(!showPresets)}>
            {showPresets ? 'Masquer les programmes tout faits' : 'Changer pour un programme tout fait'}
          </button>
          {showPresets && <PresetPicker />}
        </div>
      )}
    </section>
  )
}
