import { useState } from 'react'
import { useActions, useAppData } from '../../data/AppDataContext'
import type { BodyField } from '../../domain/types'
import { Button } from '../../ui/Button'
import { BODY_FIELDS } from './bodyFields'

const parse = (s: string) => {
  const n = Number(s.replace(',', '.'))
  return s.trim() !== '' && Number.isFinite(n) && n > 0 && n < 1000 ? n : null
}

export function BodyMetricForm({ onClose }: { onClose: () => void }) {
  const { today } = useAppData()
  const { saveBodyMetric } = useActions()
  const [day, setDay] = useState(today)
  const [values, setValues] = useState<Record<BodyField, string>>({ weightKg: '', waistCm: '', chestCm: '', armCm: '', thighCm: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = Object.fromEntries(BODY_FIELDS.map(({ field }) => [field, parse(values[field])])) as Record<BodyField, number | null>
  const empty = Object.values(parsed).every((v) => v === null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await saveBodyMetric({ id: crypto.randomUUID(), day, ...parsed })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible')
      setSaving(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-4 pt-1"
      onSubmit={(e) => {
        e.preventDefault()
        if (!empty) void save()
      }}
    >
      <div className="rows overflow-hidden rounded-md bg-surface">
        <label className="flex min-h-11 items-center justify-between gap-2 px-4 py-2">
          <span>Date</span>
          <input type="date" value={day} max={today} onChange={(e) => setDay(e.target.value || today)} className="bg-transparent text-right text-sport" />
        </label>
        {BODY_FIELDS.map(({ field, label, unit }) => (
          <label key={field} className="flex min-h-11 items-center justify-between gap-2 px-4 py-2">
            <span>
              {label} ({unit})
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={values[field]}
              onChange={(e) => setValues({ ...values, [field]: e.target.value })}
              placeholder="—"
              className="w-24 bg-transparent text-right tabular-nums placeholder:text-muted"
            />
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="t-footnote px-4 text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="ghost" tone="sport" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" tone="sport" className="flex-1" disabled={empty || saving}>
          Enregistrer
        </Button>
      </div>
    </form>
  )
}
