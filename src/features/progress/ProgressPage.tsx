import { useState } from 'react'
import { useAppData } from '../../data/AppDataContext'
import { getExercise } from '../../content/exercises'
import { addDays } from '../../domain/date'
import {
  bodySeries,
  guitarHoursSeries,
  masteredSongsSeries,
  recordsOf,
  tempoSeries,
  weightSeries,
  windowPoints,
  type Period,
  type Point,
} from '../../domain/series'
import type { AppData, BodyField } from '../../domain/types'
import { Button } from '../../ui/Button'
import { LineChart } from '../../ui/LineChart'
import { Group, Row } from '../../ui/List'
import { Screen } from '../../ui/Screen'
import { Segmented } from '../../ui/Segmented'
import { Sheet } from '../../ui/Sheet'
import { BodyMetricForm } from './BodyMetricForm'
import { BODY_FIELDS } from './bodyFields'

type Metric = 'hours' | 'tempo' | 'songs' | 'weights' | 'body' | 'measures'

const METRICS: { id: Metric; label: string }[] = [
  { id: 'hours', label: 'Heures guitare' },
  { id: 'tempo', label: 'Tempo' },
  { id: 'songs', label: 'Morceaux maîtrisés' },
  { id: 'weights', label: 'Charges' },
  { id: 'body', label: 'Poids' },
  { id: 'measures', label: 'Mensurations' },
]
const PERIODS: Period[] = [30, 90, 365]
const MEASURES = BODY_FIELDS.filter((f) => f.field !== 'weightKg')
const HOURS_MILESTONE = 10

const num = (v: number, digits = 1) => v.toLocaleString('fr-FR', { maximumFractionDigits: digits })
const shortDate = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })

interface Option {
  id: string
  label: string
}

/** Exos de guitare avec un tempo loggé, du plus récent au plus ancien ; exos inconnus ignorés. */
function tempoOptions(data: AppData): Option[] {
  const out: Option[] = []
  for (const s of [...data.guitarSessions].sort((a, b) => b.day.localeCompare(a.day)))
    for (const it of s.items) {
      if (it.kind !== 'exercise' || it.maxBpm === null || out.some((o) => o.id === it.exerciseId)) continue
      const ex = getExercise(it.exerciseId)
      if (ex) out.push({ id: ex.id, label: ex.title })
    }
  return out
}

/** Exos sport avec au moins une série, archivés compris (l'historique reste lisible). */
function weightOptions(data: AppData): Option[] {
  const names = new Map(data.programs.flatMap((p) => p.exercises.map((e) => [e.id, e.name] as const)))
  const out: Option[] = []
  for (const s of [...data.sportSessions].sort((a, b) => b.day.localeCompare(a.day)))
    for (const set of s.sets)
      if (!out.some((o) => o.id === set.programExerciseId)) out.push({ id: set.programExerciseId, label: names.get(set.programExerciseId) ?? 'Exo inconnu' })
  return out
}

interface View {
  points: Point[]
  format: (v: number) => string
  listTitle: string
  list: { day: string; label: string }[]
  records: Point[]
}

function buildView(data: AppData, metric: Metric, sub: string | undefined, today: string, period: Period): View {
  const start = addDays(today, -(period - 1))
  const inWindow = (p: { day: string }) => p.day >= start && p.day <= today
  switch (metric) {
    case 'hours': {
      const points = guitarHoursSeries(data.guitarSessions)
      const list: View['list'] = []
      let next = HOURS_MILESTONE
      for (const p of points)
        while (p.value >= next) {
          list.push({ day: p.day, label: `${next} h de guitare` })
          next += HOURS_MILESTONE
        }
      return { points, format: (v) => `${num(v)} h`, listTitle: 'Paliers', list: list.reverse(), records: [] }
    }
    case 'songs': {
      const list = data.songs
        .filter((s) => s.status === 'mastered' && s.masteredOn)
        .sort((a, b) => b.masteredOn!.localeCompare(a.masteredOn!))
        .map((s) => ({ day: s.masteredOn!, label: s.title }))
      return { points: masteredSongsSeries(data.songs), format: (v) => `${v} morceau${v > 1 ? 'x' : ''}`, listTitle: 'Morceaux', list, records: [] }
    }
    case 'tempo':
    case 'weights': {
      const points = !sub ? [] : metric === 'tempo' ? tempoSeries(data.guitarSessions, sub) : weightSeries(data.sportSessions, sub)
      const format = metric === 'tempo' ? (v: number) => `${v} bpm` : (v: number) => (v === 0 ? 'PDC' : `${num(v, 2)} kg`)
      const records = recordsOf(points).filter(inWindow)
      return { points, format, listTitle: 'Records', list: [...records].reverse().map((p) => ({ day: p.day, label: format(p.value) })), records }
    }
    case 'body':
    case 'measures': {
      const field = (metric === 'body' ? 'weightKg' : (sub ?? 'waistCm')) as BodyField
      const unit = BODY_FIELDS.find((f) => f.field === field)!.unit
      const points = bodySeries(data.bodyMetrics, field)
      const format = (v: number) => `${num(v)} ${unit}`
      const list = points
        .filter(inWindow)
        .reverse()
        .map((p) => ({ day: p.day, label: format(p.value) }))
      return { points, format, listTitle: 'Mesures', list, records: [] }
    }
  }
}

export function ProgressPage() {
  const { data, today } = useAppData()
  const [metric, setMetric] = useState<Metric>('hours')
  const [period, setPeriod] = useState<Period>(90)
  const [choice, setChoice] = useState<Partial<Record<Metric, string>>>({})
  const [adding, setAdding] = useState(false)

  const options: Option[] =
    metric === 'tempo'
      ? tempoOptions(data)
      : metric === 'weights'
        ? weightOptions(data)
        : metric === 'measures'
          ? MEASURES.map((m) => ({ id: m.field, label: m.label }))
          : []
  const sub = options.some((o) => o.id === choice[metric]) ? choice[metric] : options[0]?.id

  const view = buildView(data, metric, sub, today, period)
  const win = windowPoints(view.points, today, period)
  const list = view.list.slice(0, 10)

  return (
    <Screen title="Progrès">
      <div className="flex flex-col gap-5">
        <div role="tablist" aria-label="Métrique" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={metric === m.id}
              onClick={() => setMetric(m.id)}
              className={`tap-scale t-subhead min-h-9 shrink-0 rounded-full px-3.5 py-1.5 font-semibold whitespace-nowrap transition-colors ${
                metric === m.id ? 'bg-ink text-bg' : 'bg-surface text-ink shadow-card'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <section className="flex flex-col gap-4 rounded-[1.25rem] bg-surface p-4 shadow-card" aria-label="Courbe">
          {options.length > 0 && (
            <label className="t-subhead flex items-center justify-between gap-3">
              <span className="text-muted">{metric === 'measures' ? 'Mesure' : 'Exo'}</span>
              <select
                aria-label={metric === 'measures' ? 'Mesure' : 'Exo'}
                value={sub}
                onChange={(e) => setChoice({ ...choice, [metric]: e.target.value })}
                className="tap min-w-0 max-w-[65%] appearance-none truncate bg-transparent text-right font-semibold text-accent"
              >
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(metric === 'tempo' || metric === 'weights') && options.length === 0 && (
            <p className="t-subhead text-muted">
              {metric === 'tempo' ? 'Logge un tempo sur un exo pour voir sa courbe.' : 'Fais une séance de sport pour voir tes charges.'}
            </p>
          )}

          <div>
            <p className="t-large tabular-nums">{win.current === null ? '—' : view.format(win.current)}</p>
            {win.delta !== null && (
              <p className={`t-subhead font-semibold ${win.delta > 0 ? 'text-guitar' : 'text-muted'}`} data-testid="delta">
                {win.delta > 0 ? '+' : win.delta < 0 ? '−' : '±'}
                {view.format(Math.abs(win.delta))} sur {period} j
              </p>
            )}
          </div>

          <LineChart points={win.points} format={view.format} highlights={view.records} />

          <Segmented
            label="Période"
            options={PERIODS.map((p) => ({ value: String(p), label: `${p} j` }))}
            value={String(period)}
            onChange={(v) => setPeriod(Number(v) as Period)}
          />
        </section>

        {(metric === 'body' || metric === 'measures') && (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            + mesure
          </Button>
        )}
        {adding && (
          <Sheet label="Nouvelle mesure" onClose={() => setAdding(false)} title={() => <h2 className="t-headline text-center">Nouvelle mesure</h2>}>
            {(close) => <BodyMetricForm onClose={close} />}
          </Sheet>
        )}

        {list.length > 0 && (
          <Group header={view.listTitle}>
            {list.map((r) => (
              <Row key={`${r.day}-${r.label}`} title={r.label} detail={shortDate(r.day)} />
            ))}
          </Group>
        )}
      </div>
    </Screen>
  )
}
