import { useState } from 'react'
import { useActions, useAppData } from '../../data/AppDataContext'
import { todayParis } from '../../domain/date'
import type { Rating } from '../../domain/types'
import { useRun } from '../settings/useRun'
import { hiddenUntil, hideUntil } from './later'

const SLEEP = [5, 6, 7, 8, 9]
const ENERGY: Rating[] = [1, 2, 3, 4, 5]
const HOUR = new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Paris' })
const parisHour = () => Number(HOUR.formatToParts(new Date()).find((p) => p.type === 'hour')!.value)

function Chips<T extends number>({
  label,
  values,
  value,
  format,
  onPick,
}: {
  label: string
  values: T[]
  value: T | null
  format: (v: T) => string
  onPick: (v: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <span className="t-subhead w-16 shrink-0 text-muted">{label}</span>
      {values.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onPick(v)}
          className={`tap t-callout min-h-11 flex-1 rounded-md font-semibold tabular-nums ${value === v ? 'bg-ink text-bg' : 'bg-inset text-ink'}`}
        >
          {format(v)}
        </button>
      ))}
    </div>
  )
}

/** Check-in du matin (lot 5), facultatif : sommeil et énergie en 2 taps, avant midi, le jour même. */
export function MorningCheckin() {
  const { v1, today } = useAppData()
  const { saveCheckin, setMorningCheckin } = useActions()
  const { run } = useRun()
  const [sleep, setSleep] = useState<number | null>(null)
  const [energy, setEnergy] = useState<Rating | null>(null)
  const [skipped, setSkipped] = useState(() => hiddenUntil('checkin') === today)
  const due =
    v1.profile.morningCheckin !== false && today === todayParis() && parisHour() < 12 && !v1.profile.checkins?.some((c) => c.day === today) && !skipped
  if (!due) return null

  const save = (s: number | null, e: Rating | null) => {
    if (s !== null && e !== null) void run(() => saveCheckin({ day: today, sleepHours: s, energy: e }))
  }
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface px-5 py-4.5 shadow-card" aria-labelledby="checkin-title">
      <h2 id="checkin-title" className="t-headline">
        Bien dormi ?
      </h2>
      <Chips
        label="Sommeil"
        values={SLEEP}
        value={sleep}
        format={(v) => (v === 9 ? '9 h+' : `${v} h`)}
        onPick={(v) => {
          setSleep(v)
          save(v, energy)
        }}
      />
      <Chips
        label="Énergie"
        values={ENERGY}
        value={energy}
        format={String}
        onPick={(v) => {
          setEnergy(v)
          save(sleep, v)
        }}
      />
      <div className="t-footnote flex justify-between text-muted">
        <button
          type="button"
          className="hit tap py-1"
          onClick={() => {
            hideUntil('checkin', today)
            setSkipped(true)
          }}
        >
          Passer
        </button>
        <button type="button" className="hit tap py-1" onClick={() => void run(() => setMorningCheckin(false))}>
          Ne plus proposer
        </button>
      </div>
    </section>
  )
}
