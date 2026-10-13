import { addDays } from './date'
import type { BodyField, BodyMetric, Day, GuitarSession, Song, SportSession, SportSet } from './types'

export interface Point {
  day: Day
  value: number
}

export type Period = 30 | 90 | 365

const byDay = (a: { day: Day }, b: { day: Day }) => a.day.localeCompare(b.day)

/** Cumul par jour, précédé d'un point 0 la veille du premier jour. */
function cumulative(entries: { day: Day; amount: number }[]): Point[] {
  const perDay = new Map<Day, number>()
  for (const e of [...entries].sort(byDay)) perDay.set(e.day, (perDay.get(e.day) ?? 0) + e.amount)
  if (perDay.size === 0) return []
  const days = [...perDay.keys()]
  const points: Point[] = [{ day: addDays(days[0], -1), value: 0 }]
  let total = 0
  for (const d of days) {
    total += perDay.get(d)!
    points.push({ day: d, value: total })
  }
  return points
}

/** Meilleure valeur cumulée (max courant), un point par jour où une valeur existe. */
function runningMax(entries: { day: Day; value: number }[]): Point[] {
  const perDay = new Map<Day, number>()
  for (const e of [...entries].sort(byDay)) perDay.set(e.day, Math.max(perDay.get(e.day) ?? -Infinity, e.value))
  const points: Point[] = []
  let best = -Infinity
  for (const [day, v] of perDay) {
    best = Math.max(best, v)
    points.push({ day, value: best })
  }
  return points
}

export function guitarHoursSeries(sessions: GuitarSession[]): Point[] {
  return cumulative(sessions.map((s) => ({ day: s.day, amount: s.durationMin / 60 })))
}

export function masteredSongsSeries(songs: Song[]): Point[] {
  return cumulative(songs.flatMap((s) => (s.status === 'mastered' && s.masteredOn ? [{ day: s.masteredOn, amount: 1 }] : [])))
}

export function tempoSeries(sessions: GuitarSession[], exerciseId: string): Point[] {
  return runningMax(
    sessions.flatMap((s) =>
      s.items.flatMap((it) => (it.kind === 'exercise' && it.exerciseId === exerciseId && it.maxBpm !== null ? [{ day: s.day, value: it.maxBpm }] : [])),
    ),
  )
}

/**
 * Force estimée (1RM, formule d'Epley) : charge × (1 + reps / 30), au 0,1 kg près. Sans plafond de reps :
 * le coach de séance demande des reps en plus sur les exos légers, et chacune doit faire monter la courbe.
 */
export function e1rm(weightKg: number, reps: number): number {
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10
}

export interface StrengthSeries {
  unit: 'kg' | 'reps'
  points: Point[]
  /** Pour chaque jour qui a un point : la série qui donne sa valeur (max courant). */
  best: Map<Day, SportSet>
}

/**
 * Courbe de force d'un exo sport, en max courant. Dès qu'une série est chargée (> 0 kg) : 1RM estimé,
 * les séries à 0 kg (échauffements) sont ignorées. Sinon (poids du corps) : max de reps en une série.
 */
export function strengthSeries(sessions: SportSession[], programExerciseId: string): StrengthSeries {
  const sets = [...sessions]
    .sort(byDay)
    .flatMap((s) => s.sets.filter((x) => x.programExerciseId === programExerciseId).map((set) => ({ day: s.day, set })))
  const unit = sets.some((x) => x.set.weightKg > 0) ? 'kg' : 'reps'
  const valueOf = (set: SportSet) => (unit === 'kg' ? e1rm(set.weightKg, set.reps) : set.reps)
  const points: Point[] = []
  const best = new Map<Day, SportSet>()
  let top: SportSet | null = null
  for (const { day, set } of sets) {
    if (unit === 'kg' && set.weightKg <= 0) continue
    if (top === null || valueOf(set) > valueOf(top)) top = set
    const point = { day, value: valueOf(top) }
    if (points.at(-1)?.day === day) points[points.length - 1] = point
    else points.push(point)
    best.set(day, top)
  }
  return { unit, points, best }
}

export function bodySeries(metrics: BodyMetric[], field: BodyField): Point[] {
  const perDay = new Map<Day, number>()
  for (const m of [...metrics].sort(byDay)) {
    const v = m[field]
    if (v !== null) perDay.set(m.day, v)
  }
  return [...perDay].map(([day, value]) => ({ day, value }))
}

export function windowPoints(points: Point[], today: Day, period: Period): { points: Point[]; current: number | null; delta: number | null } {
  const sorted = [...points].sort(byDay).filter((p) => p.day <= today)
  if (sorted.length === 0) return { points: [], current: null, delta: null }
  const start = addDays(today, -(period - 1))
  const before = sorted.filter((p) => p.day < start).at(-1)
  const inside = sorted.filter((p) => p.day >= start)
  const current = sorted.at(-1)!.value
  const baseline = before ?? inside[0]
  return {
    points: before ? [{ day: start, value: before.value }, ...inside] : inside,
    current,
    delta: current - baseline.value,
  }
}

export function recordsOf(points: Point[]): Point[] {
  let best = -Infinity
  return points.filter((p) => {
    if (p.value <= best) return false
    best = p.value
    return true
  })
}
