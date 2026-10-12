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
    <div className="flex flex-col gap-3">
      {SPORT_PRESETS.map((preset) => (
        <Card key={preset.id} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="t-headline">{preset.name}</p>
            <button type="button" className="tap t-subhead text-accent" onClick={() => setOpen(open === preset.id ? null : preset.id)}>
              {open === preset.id ? 'Masquer les exos' : 'Voir les exos'}
            </button>
          </div>
          <p className="t-subhead text-muted">{preset.description}</p>
          <p className="t-footnote text-muted">
            {preset.sessions.length} séances : {preset.sessions.map((x) => x.name).join(' · ')}
          </p>
          {open === preset.id && (
            <div className="t-subhead animate-rise flex flex-col gap-2 rounded-[0.75rem] bg-surface-2 p-3 dark:bg-fill">
              {preset.sessions.map((s) => (
                <div key={s.name}>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-muted">{s.exercises.map((e) => `${e.name} ${e.sets}×${e.reps}`).join(' · ')}</p>
                </div>
              ))}
            </div>
          )}
          {confirming === preset.id ? (
            <div className="flex flex-col gap-2">
              <p className="t-subhead">Tes séances actuelles seront remplacées (l'historique est gardé).</p>
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
        <p role="alert" className="t-footnote px-4 text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
