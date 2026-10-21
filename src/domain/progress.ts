/**
 * Écran Progrès (lot 4) : voir en 10 secondes si j'avance. Ce qui a été gagné sur la période, les courbes en plus
 * (km et allure de course, volume de muscu), la répartition du temps de guitare et le mur des records.
 */
import { CATEGORY_LABELS, getExercise, type ExerciseCategory } from '../content/exercises'
import { addDays, weekStart } from './date'
import { e1rm, recordsOf, strengthSeries, tempoSeries, type Point } from './series'
import type { AppData, Day, Domain } from './types'

/** Une sortie de course faite : jour, distance, durée (secondes). */
export interface RunDone {
  day: Day
  km: number
  sec: number
}

/** Valeur de départ de la période : la dernière d'avant, sinon la première de la période (historique récent). */
const baseline = (points: { day: Day; value: number }[], start: Day) =>
  points.filter((p) => p.day < start).at(-1)?.value ?? points.find((p) => p.day >= start)?.value

const maxOrNull = (values: number[]) => (values.length > 0 ? Math.max(...values) : null)

/** Ce qui a bougé entre avant la période et maintenant. null quand rien n'est comparable. */
export interface Gains {
  tempo: { name: string; from: number; to: number } | null
  songs: number
  strength: { name: string; from: number; to: number } | null
  km: number
  longest: { from: number | null; to: number } | null
}

export function gains(data: AppData, runs: RunDone[], today: Day, days: number): Gains {
  const start = addDays(today, -(days - 1))
  const inside = (d: Day) => d >= start && d <= today

  let tempo: Gains['tempo'] = null
  const exercises = new Set(data.guitarSessions.flatMap((s) => s.items.flatMap((it) => (it.kind === 'exercise' ? [it.exerciseId] : []))))
  for (const id of exercises) {
    const points = tempoSeries(data.guitarSessions, id)
    const before = baseline(points, start)
    const now = points.filter((p) => p.day <= today).at(-1)?.value
    if (before === undefined || now === undefined || now <= before) continue
    if (!tempo || now - before > tempo.to - tempo.from) tempo = { name: getExercise(id)?.title ?? 'Exo', from: before, to: now }
  }

  let strength: Gains['strength'] = null
  const names = new Map(data.programs.flatMap((p) => p.exercises.map((e) => [e.id, e.name] as const)))
  const ids = new Set(data.sportSessions.flatMap((s) => s.sets.map((x) => x.programExerciseId)))
  for (const id of ids) {
    const { unit, points } = strengthSeries(data.sportSessions, id)
    if (unit !== 'kg') continue
    const before = baseline(points, start)
    const now = points.filter((p) => p.day <= today).at(-1)?.value
    if (before === undefined || now === undefined || now <= before) continue
    if (!strength || now - before > strength.to - strength.from) strength = { name: names.get(id) ?? 'Exo', from: before, to: now }
  }

  const runsIn = runs.filter((r) => inside(r.day))
  const longestNow = maxOrNull(runsIn.map((r) => r.km))
  return {
    tempo,
    songs: data.songs.filter((s) => s.status === 'mastered' && s.masteredOn && inside(s.masteredOn)).length,
    strength,
    km: Math.round(runsIn.reduce((t, r) => t + r.km, 0) * 10) / 10,
    longest: longestNow === null ? null : { from: maxOrNull(runs.filter((r) => r.day < start).map((r) => r.km)), to: longestNow },
  }
}

/** Somme par semaine (lundi), un point par semaine qui a quelque chose. */
function perWeek(entries: { day: Day; amount: number }[]): Point[] {
  const m = new Map<Day, number>()
  for (const e of entries) m.set(weekStart(e.day), (m.get(weekStart(e.day)) ?? 0) + e.amount)
  return [...m].sort(([a], [b]) => a.localeCompare(b)).map(([day, value]) => ({ day, value: Math.round(value * 10) / 10 }))
}

export const kmPerWeek = (runs: RunDone[]) => perWeek(runs.map((r) => ({ day: r.day, amount: r.km })))

/** Allure de chaque sortie, en secondes par km (plus bas = plus rapide). */
export const paceSeries = (runs: RunDone[]): Point[] => runs.filter((r) => r.km > 0 && r.sec > 0).map((r) => ({ day: r.day, value: Math.round(r.sec / r.km) }))

/** Volume de muscu par semaine : charge × reps de toutes les séries. */
export const volumePerWeek = (data: AppData) => perWeek(data.sportSessions.flatMap((s) => s.sets.map((x) => ({ day: s.day, amount: x.weightKg * x.reps }))))

/**
 * Temps de guitare par catégorie sur la période, en minutes. Une séance n'a qu'une durée : elle est partagée à parts
 * égales entre ses exos (leur catégorie) et ses morceaux (« Répertoire »).
 */
export function guitarSplit(data: AppData, from: Day, to: Day): { label: string; minutes: number }[] {
  const m = new Map<string, number>()
  for (const s of data.guitarSessions) {
    if (s.day < from || s.day > to) continue
    const parts = s.items.map((it) => {
      if (it.kind === 'song') return 'Répertoire'
      const c = getExercise(it.exerciseId)?.category as ExerciseCategory | undefined
      return c ? CATEGORY_LABELS[c] : 'Autre'
    })
    const shares = parts.length > 0 ? parts : ['Sans détail']
    for (const p of shares) m.set(p, (m.get(p) ?? 0) + s.durationMin / shares.length)
  }
  return [...m].map(([label, minutes]) => ({ label, minutes: Math.round(minutes) })).sort((a, b) => b.minutes - a.minutes)
}

export interface RecordEntry {
  day: Day
  domain: Domain
  label: string
}

/** Le mur des records, les deux disciplines mélangées, du plus récent au plus ancien. Un premier essai n'est pas un record. */
export function recordWall(data: AppData, runs: RunDone[]): RecordEntry[] {
  const out: RecordEntry[] = []
  const exercises = new Set(data.guitarSessions.flatMap((s) => s.items.flatMap((it) => (it.kind === 'exercise' ? [it.exerciseId] : []))))
  for (const id of exercises)
    for (const p of recordsOf(tempoSeries(data.guitarSessions, id)).slice(1))
      out.push({ day: p.day, domain: 'guitar', label: `${getExercise(id)?.title ?? 'Exo'} · ${p.value} bpm` })
  for (const s of data.songs)
    if (s.status === 'mastered' && s.masteredOn) out.push({ day: s.masteredOn, domain: 'guitar', label: `Morceau maîtrisé · ${s.title}` })

  const names = new Map(data.programs.flatMap((p) => p.exercises.map((e) => [e.id, e.name] as const)))
  const ids = new Set(data.sportSessions.flatMap((s) => s.sets.map((x) => x.programExerciseId)))
  for (const id of ids) {
    const { unit, points, best } = strengthSeries(data.sportSessions, id)
    for (const p of recordsOf(points).slice(1)) {
      const set = best.get(p.day)
      const what =
        unit === 'kg' && set
          ? `${String(set.weightKg).replace('.', ',')} kg × ${set.reps} (≈ ${String(e1rm(set.weightKg, set.reps)).replace('.', ',')} kg)`
          : `${p.value} reps`
      out.push({ day: p.day, domain: 'sport', label: `${names.get(id) ?? 'Exo'} · ${what}` })
    }
  }
  let longest = 0
  for (const r of [...runs].sort((a, b) => a.day.localeCompare(b.day))) {
    if (longest > 0 && r.km > longest) out.push({ day: r.day, domain: 'sport', label: `Plus longue sortie · ${String(r.km).replace('.', ',')} km` })
    longest = Math.max(longest, r.km)
  }
  return out.sort((a, b) => b.day.localeCompare(a.day))
}
