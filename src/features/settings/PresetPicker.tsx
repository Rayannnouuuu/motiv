import { useState } from 'react'
import { presetToPrograms, SPORT_PRESETS, type SportPreset } from '../../content/sportPresets'
import { useActions, useAppData } from '../../data/AppDataContext'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { useRun } from './useRun'

/** Programmes tout faits : les appliquer remplace (archive) les séances actuelles. */
export function PresetPicker() {
  const { data } = useAppData()
  const { saveProgram } = useActions()
  const { busy, error, run } = useRun()
  const [confirming, setConfirming] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const active = data.programs.filter((p) => !p.archived)

  const apply = (preset: SportPreset) =>
    run(async () => {
      const start = Math.max(-1, ...data.programs.map((p) => p.position)) + 1
      for (const p of active) await saveProgram({ ...p, archived: true })
      for (const p of presetToPrograms(preset, start, () => crypto.randomUUID())) await saveProgram(p)
      setConfirming(null)
    })

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-semibold">Programmes tout faits</h3>
      {SPORT_PRESETS.map((preset) => (
        <Card key={preset.id} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-semibold">{preset.name}</p>
            <button type="button" className="text-sm text-muted underline" onClick={() => setOpen(open === preset.id ? null : preset.id)}>
              {open === preset.id ? 'Masquer' : 'Détails'}
            </button>
          </div>
          <p className="text-sm text-muted">{preset.description}</p>
          {open === preset.id && (
            <div className="flex flex-col gap-2 text-sm">
              {preset.sessions.map((s) => (
                <div key={s.name}>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-muted">{s.exercises.map((e) => `${e.name} ${e.sets}×${e.reps}`).join(' · ')}</p>
                </div>
              ))}
            </div>
          )}
          {confirming === preset.id ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm">Tes séances actuelles seront remplacées (l'historique est gardé).</p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setConfirming(null)}>
                  Annuler
                </Button>
                <Button className="flex-1" disabled={busy} onClick={() => apply(preset)}>
                  Remplacer
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" disabled={busy} onClick={() => (active.length > 0 ? setConfirming(preset.id) : apply(preset))}>
              Suivre {preset.name}
            </Button>
          )}
        </Card>
      ))}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
