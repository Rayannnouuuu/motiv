/**
 * Détection de plateau (lot 5) : pas de record depuis 4 séances sur un exo, ou l'envie en baisse 3 séances de
 * suite. La carte propose de changer de variante, d'alléger une semaine ou de travailler une autre
 * sous-compétence. Jamais d'abandonner.
 */
import { CATEGORY_LABELS, EXERCISES, getExercise, type ExerciseCategory } from '../content/exercises'
import { addDays } from './date'
import { e1rm } from './series'
import type { AppData, Day, Domain } from './types'

export const PLATEAU_SESSIONS = 4
export const DESIRE_DROPS = 3
/** Un exo laissé de côté depuis plus longtemps n'est plus « bloqué » : on ne le signale pas. */
const RECENT_DAYS = 21

export type Plateau =
  { kind: 'record'; domain: Domain; id: string; name: string; best: number; unit: 'bpm' | 'kg' | 'reps' } | { kind: 'desire'; domain: Domain; values: number[] }

export interface Suggestion {
  label: string
  to?: string
}

const byTime = <T extends { day: Day; createdAt: string }>(a: T, b: T) => a.day.localeCompare(b.day) || a.createdAt.localeCompare(b.createdAt)

/** Valeurs séance par séance ; plateau si aucune des 4 dernières ne bat le meilleur d'avant. */
function stuck(values: number[]): number | null {
  if (values.length <= PLATEAU_SESSIONS) return null
  const best = Math.max(...values.slice(0, -PLATEAU_SESSIONS))
  return Math.max(...values.slice(-PLATEAU_SESSIONS)) <= best ? best : null
}

/** 3 baisses de suite : chaque séance notée plus bas que la précédente. */
function dropping(values: number[]): number[] | null {
  const last = values.slice(-(DESIRE_DROPS + 1))
  return last.length === DESIRE_DROPS + 1 && last.every((v, i) => i === 0 || v < last[i - 1]) ? last : null
}

export function plateaus(data: AppData, today: Day): Plateau[] {
  const out: Plateau[] = []
  const recent = addDays(today, -RECENT_DAYS)
  const guitar = [...data.guitarSessions].sort(byTime)
  const sport = [...data.sportSessions].sort(byTime)

  for (const [domain, list] of [
    ['guitar', guitar],
    ['sport', sport],
  ] as const) {
    const values = dropping(list.map((s) => s.desireRating))
    if (values && list.at(-1)!.day >= recent) out.push({ kind: 'desire', domain, values })
  }

  const exercises = new Set(guitar.flatMap((s) => s.items.flatMap((it) => (it.kind === 'exercise' && it.maxBpm !== null ? [it.exerciseId] : []))))
  for (const id of exercises) {
    const played = guitar.flatMap((s) => {
      const bpm = s.items.flatMap((it) => (it.kind === 'exercise' && it.exerciseId === id && it.maxBpm !== null ? [it.maxBpm] : []))
      return bpm.length > 0 ? [{ day: s.day, value: Math.max(...bpm) }] : []
    })
    const best = stuck(played.map((p) => p.value))
    if (best !== null && played.at(-1)!.day >= recent)
      out.push({ kind: 'record', domain: 'guitar', id, name: getExercise(id)?.title ?? 'Exo', best, unit: 'bpm' })
  }

  const names = new Map(data.programs.flatMap((p) => p.exercises.map((e) => [e.id, e.name] as const)))
  const ids = new Set(sport.flatMap((s) => s.sets.map((x) => x.programExerciseId)))
  for (const id of ids) {
    const sets = sport.map((s) => ({ day: s.day, sets: s.sets.filter((x) => x.programExerciseId === id) })).filter((x) => x.sets.length > 0)
    const loaded = sets.some((x) => x.sets.some((y) => y.weightKg > 0))
    const values = sets.map((x) => Math.max(...x.sets.map((y) => (loaded ? e1rm(y.weightKg, y.reps) : y.reps))))
    const best = stuck(values)
    if (best !== null && sets.at(-1)!.day >= recent)
      out.push({ kind: 'record', domain: 'sport', id, name: names.get(id) ?? 'Exo', best, unit: loaded ? 'kg' : 'reps' })
  }
  // L'envie d'abord : c'est elle qui fait revenir.
  return out.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'desire' ? -1 : 1))
}

/** Catégorie la moins travaillée ces 30 derniers jours (hors celle de l'exo bloqué). */
function quietCategory(data: AppData, today: Day, not?: ExerciseCategory): ExerciseCategory {
  const count = new Map<ExerciseCategory, number>(Object.keys(CATEGORY_LABELS).map((c) => [c as ExerciseCategory, 0]))
  for (const s of data.guitarSessions)
    if (s.day > addDays(today, -30))
      for (const it of s.items) {
        const c = it.kind === 'exercise' ? getExercise(it.exerciseId)?.category : undefined
        if (c) count.set(c, count.get(c)! + 1)
      }
  return [...count].filter(([c]) => c !== not).sort((a, b) => a[1] - b[1])[0][0]
}

const kg = (v: number) => `${String(Math.round(v * 2) / 2).replace('.', ',')} kg`

export function suggestions(p: Plateau, data: AppData, today: Day): Suggestion[] {
  if (p.kind === 'desire')
    return p.domain === 'guitar'
      ? [
          { label: 'Commence par un morceau que tu aimes, la technique après.' },
          { label: 'Cette semaine, 15 minutes suffisent : une séance courte compte.' },
          { label: `Change de terrain : ${CATEGORY_LABELS[quietCategory(data, today)].toLowerCase()}.`, to: '/moi/exercices' },
        ]
      : [
          { label: 'Allège une semaine : une série de moins par exo.' },
          { label: 'Remplace une séance par une sortie facile ou du vélo.' },
          { label: 'Change les exos de ta séance pour une semaine.', to: '/moi/modeles' },
        ]
  if (p.domain === 'guitar') {
    const ex = getExercise(p.id)
    const variant =
      ex &&
      EXERCISES.filter((e) => e.category === ex.category && e.id !== ex.id).sort(
        (a, b) => Math.abs(a.difficulty - ex.difficulty) - Math.abs(b.difficulty - ex.difficulty),
      )[0]
    const other = quietCategory(data, today, ex?.category)
    return [
      variant
        ? { label: `Change de variante : ${variant.title}.`, to: `/exo/${variant.id}` }
        : { label: 'Change de variante : un autre exo de la même famille.' },
      { label: `Allège une semaine : joue-le propre à ${Math.round(p.best * 0.9)} bpm, puis remonte.` },
      { label: `Travaille une autre sous-compétence : ${CATEGORY_LABELS[other].toLowerCase()}.`, to: '/moi/exercices' },
    ]
  }
  return [
    { label: 'Change de variante : prise, angle ou version à un bras.', to: '/moi/modeles' },
    p.unit === 'kg'
      ? { label: `Allège une semaine : environ ${kg(p.best * 0.75)} pour tes séries, puis remonte.` }
      : { label: 'Allège une semaine : 2 reps de moins par série, puis remonte.' },
    {
      label:
        p.unit === 'kg'
          ? 'Travaille une autre qualité : plus de reps à charge moyenne (8 à 12).'
          : 'Travaille une autre qualité : tempo lent, 3 secondes à la descente.',
    },
  ]
}

/** Titre de la carte. */
export const plateauTitle = (p: Plateau) =>
  p.kind === 'desire'
    ? `Ton envie baisse depuis ${DESIRE_DROPS} séances de ${p.domain === 'guitar' ? 'guitare' : 'sport'}`
    : `${p.name} : pas de record depuis ${PLATEAU_SESSIONS} séances`

/** Clé stable pour « Plus tard ». */
export const plateauKey = (p: Plateau) => (p.kind === 'desire' ? `desire:${p.domain}` : `record:${p.domain}:${p.id}`)
