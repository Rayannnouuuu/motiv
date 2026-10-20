import { useState } from 'react'
import { useActions, useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import type { Program, ProgramExercise } from '../../domain/types'
import { Group, Row } from '../../ui/List'
import { Sheet } from '../../ui/Sheet'
import { PresetPicker } from './PresetPicker'
import { useRun } from './useRun'

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position
const field = 'min-w-0 bg-transparent outline-none placeholder:text-muted'
const num = 'size-11 rounded-sm bg-fill text-center tabular-nums outline-none'

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
function SessionEditor({ initial, isNew, onSave, onClose, onDelete }: {
  initial: Program
  isNew: boolean
  /** Renvoie `true` si c'est enregistré (la feuille se ferme alors). */
  onSave: (p: Program) => Promise<boolean>
  onClose: () => void
  onDelete: () => Promise<boolean>
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

  async function save(close: () => void) {
    setBusy(true)
    // Positions recalées 0, 1, 2… dans l'ordre affiché.
    const order = new Map(visible.map((e, k) => [e.id, k]))
    const ok = await onSave({ ...draft, name: draft.name.trim(), exercises: draft.exercises.map((e) => ({ ...e, name: e.name.trim(), position: order.get(e.id) ?? e.position })) })
    setBusy(false)
    if (ok) close()
  }

  return (
    <Sheet
      label={isNew ? 'Nouvelle séance' : `Modifier ${initial.name}`}
      onClose={onClose}
      title={(close) => (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button type="button" className="hit tap t-body justify-self-start text-sport" onClick={close}>
            Annuler
          </button>
          <h2 className="t-headline truncate">{isNew ? 'Nouvelle séance' : initial.name}</h2>
          <button type="button" className="hit tap t-headline justify-self-end text-sport disabled:text-faint" disabled={!dirty || !valid || busy} onClick={() => void save(close)}>
            Enregistrer
          </button>
        </div>
      )}
    >
      {(close) => (
        <div className="flex flex-col gap-6 pt-2">
          <Group>
            <label className="flex min-h-11 items-center gap-3 px-4 py-1.5">
              <span className="t-body shrink-0">Nom</span>
              <input
                aria-label="Nom de la séance"
                placeholder="ex. Haut"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className={`${field} t-body flex-1 py-1.5 text-right font-semibold`}
              />
            </label>
          </Group>

          <Group header="Exos" footer="Séries × reps visées. Retirer un exo garde son historique.">
            {visible.map((ex, i) => {
              const label = ex.name || `exo ${i + 1}`
              return (
                // Nom sur sa propre ligne : en entier même sur un petit écran (« Développé couché » / « incliné »).
                <div key={ex.id} className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2">
                  <input
                    aria-label={`Nom · exo ${i + 1}`}
                    placeholder="Nom de l'exo"
                    value={ex.name}
                    onChange={(e) => setExercise(ex.id, { name: e.target.value })}
                    className={`${field} t-body min-h-11 basis-full`}
                  />
                  <input
                    aria-label={`Séries · ${label}`}
                    type="text"
                    inputMode="numeric"
                    value={ex.targetSets || ''}
                    onChange={(e) => setExercise(ex.id, { targetSets: Number(e.target.value.replace(/\D/g, '')) })}
                    className={`t-callout ${num}`}
                  />
                  <span className="t-footnote text-muted" aria-hidden>
                    ×
                  </span>
                  <input
                    aria-label={`Reps · ${label}`}
                    type="text"
                    inputMode="numeric"
                    value={ex.targetReps || ''}
                    onChange={(e) => setExercise(ex.id, { targetReps: Number(e.target.value.replace(/\D/g, '')) })}
                    className={`t-callout ${num}`}
                  />
                  <div className="ml-auto flex shrink-0 items-center text-muted">
                    <button type="button" aria-label={`Monter ${label}`} disabled={i === 0} className="hit tap px-1.5 py-1 disabled:opacity-25" onClick={() => reorder(i, -1)}>
                      <Arrow up />
                    </button>
                    <button type="button" aria-label={`Descendre ${label}`} disabled={i === visible.length - 1} className="hit tap px-1.5 py-1 disabled:opacity-25" onClick={() => reorder(i, 1)}>
                      <Arrow />
                    </button>
                    <button type="button" aria-label={`Retirer ${label}`} className="hit tap py-1 pl-1.5" onClick={() => remove(ex)}>
                      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
                        <circle cx="10" cy="10" r="9" className="fill-danger" />
                        <path d="M6 10h8" className="stroke-on-danger" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
            <Row onClick={addExercise} chevron={false}>
              <span className="t-body flex items-center gap-1.5 text-sport">
                <Icon name="plus" />
                Ajouter un exo
              </span>
            </Row>
          </Group>

          {!isNew && (
            <Group footer={confirmDelete ? `Supprimer « ${initial.name} » ? L'historique est gardé.` : undefined}>
              {confirmDelete ? (
                <div className="flex">
                  <button type="button" className="tap-row t-body flex-1 py-3 text-sport" onClick={() => setConfirmDelete(false)}>
                    Non
                  </button>
                  <button type="button" className="tap-row t-headline flex-1 py-3 text-danger" onClick={() => void onDelete().then((ok) => ok && close())}>
                    Supprimer
                  </button>
                </div>
              ) : (
                <Row onClick={() => setConfirmDelete(true)} chevron={false}>
                  <span className="t-body text-center text-danger">Supprimer la séance</span>
                </Row>
              )}
            </Group>
          )}
        </div>
      )}
    </Sheet>
  )
}

/** Monter / descendre : le chevron du design system, tourné. */
function Arrow({ up }: { up?: boolean }) {
  return <Icon name="chevron" className={up ? '-rotate-90' : 'rotate-90'} />
}

export function ProgramEditor() {
  const { data } = useAppData()
  const { saveProgram } = useActions()
  const { busy, error, run } = useRun()
  // Figé à l'ouverture : la feuille garde son titre pendant qu'elle se ferme après l'enregistrement.
  const [editing, setEditing] = useState<{ program: Program; isNew: boolean } | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [showPresets, setShowPresets] = useState(false)
  const programs = data.programs.filter((p) => !p.archived).sort(byPosition)
  const nextPosition = Math.max(-1, ...data.programs.map((p) => p.position)) + 1

  const save = (...ps: Program[]) =>
    run(async () => {
      for (const p of ps) await saveProgram(p)
    })

  return (
    <>
      <Group
        header="Programme sport"
        footer={programs.length === 0 ? 'Choisis un programme tout fait, ou crée tes séances.' : "Les séances s'enchaînent dans cet ordre."}
      >
        {programs.map((p) => (
          <Row
            key={p.id}
            onClick={editing ? undefined : () => setEditing({ program: p, isNew: false })}
            aria-label={`Modifier ${p.name}`}
            title={p.name}
            subtitle={
              p.exercises
                .filter((e) => !e.archived)
                .sort(byPosition)
                .map((e) => `${e.name} ${e.targetSets}×${e.targetReps}`)
                .join(' · ') || 'Aucun exo'
            }
            chevron
          />
        ))}
        <Row
          onClick={() => {
            setSaved(null)
            setEditing({ program: { id: crypto.randomUUID(), name: '', position: nextPosition, archived: false, exercises: [] }, isNew: true })
          }}
          chevron={false}
        >
          <span className="t-body flex items-center gap-1.5 text-sport">
            <Icon name="plus" />
            Nouvelle séance
          </span>
        </Row>
        {programs.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-2" aria-label="Ordre des séances">
            <span className="t-footnote w-full text-muted">Ordre</span>
            {programs.map((p, i) => (
              <span key={p.id} className="t-footnote flex items-center rounded-full bg-fill pl-2.5">
                {p.name}
                <button type="button" aria-label={`Monter ${p.name}`} disabled={i === 0 || busy} className="hit tap px-1 py-1 text-muted disabled:opacity-25" onClick={() => save(...move(programs, i, -1))}>
                  <Arrow up />
                </button>
                <button type="button" aria-label={`Descendre ${p.name}`} disabled={i === programs.length - 1 || busy} className="hit tap py-1 pr-1.5 text-muted disabled:opacity-25" onClick={() => save(...move(programs, i, 1))}>
                  <Arrow />
                </button>
              </span>
            ))}
          </div>
        )}
        {programs.length > 0 && (
          <Row onClick={() => setShowPresets(true)} chevron>
            <span className="t-body">Changer pour un programme tout fait</span>
          </Row>
        )}
      </Group>
      {saved && !editing && (
        <p className="t-footnote -mt-6 px-4 text-sport">
          « {saved} » enregistrée <Icon name="check" />
        </p>
      )}
      {error && (
        <p role="alert" className="t-footnote -mt-6 px-4 text-danger">
          {error}
        </p>
      )}

      {programs.length === 0 && <PresetPicker />}

      {editing && (
        <SessionEditor
          key={editing.program.id}
          initial={editing.program}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSave={async (x) => {
            // En cas d'erreur, le brouillon reste ouvert.
            const ok = await save(x)
            if (ok) setSaved(x.name)
            return ok
          }}
          onDelete={() => save({ ...editing.program, archived: true })}
        />
      )}

      {showPresets && (
        <Sheet label="Programmes tout faits" onClose={() => setShowPresets(false)} title={(close) => (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
            <span />
            <h2 className="t-headline">Programmes tout faits</h2>
            <button type="button" className="hit tap t-headline justify-self-end text-sport" onClick={close}>
              OK
            </button>
          </div>
        )}>
          {(close) => <PresetPicker onDone={close} />}
        </Sheet>
      )}
    </>
  )
}
