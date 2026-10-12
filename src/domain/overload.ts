import { daysBetween } from './date'
import type { Day, ProgramExercise, SportSession, SportSet } from './types'

export type LoadTrend = 'new' | 'up' | 'same' | 'down'

/** Charge et reps à viser aujourd'hui sur un exo, avec la phrase qui l'explique. */
export interface LoadSuggestion {
  weightKg: number
  reps: number
  trend: LoadTrend
  /** null sans historique. */
  hint: string | null
}

const STEP = 2.5
/** Au-delà de 3 semaines sans l'exo, on reprend plus léger. */
const LAYOFF_DAYS = 21
/** Sous cette charge, un cran de 2,5 kg pèse trop lourd : on monte d'abord en reps. */
const LIGHT_KG = 20
/** On ajoute des reps jusqu'à R + 4, puis on passe au cran de charge. */
const EXTRA_REPS = 4

const kg = (w: number) => w.toLocaleString('fr-FR')

/** 90 % de la charge, au cran de 2,5 kg inférieur ; une charge de 2,5 kg ou moins reste telle quelle. */
function ease(w: number): number {
  if (w <= STEP) return w
  return Math.max(0, Math.floor((w * 0.9) / STEP + 1e-9) * STEP)
}

/** Charge la plus fréquente parmi les séries ; à égalité, la plus lourde. */
function workingLoad(sets: SportSet[]): number {
  const count = new Map<number, number>()
  for (const s of sets) count.set(s.weightKg, (count.get(s.weightKg) ?? 0) + 1)
  let best = 0
  let bestCount = 0
  for (const [w, n] of count)
    if (n > bestCount || (n === bestCount && w > best)) {
      best = w
      bestCount = n
    }
  return best
}

/**
 * Charge du jour (surcharge progressive) d'après les deux dernières séances où l'exo a été fait :
 * reprise après une pause, progression une fois l'objectif validé, décharge après deux échecs à la même charge.
 */
export function suggestLoad(
  pe: Pick<ProgramExercise, 'id' | 'targetSets' | 'targetReps'>,
  history: SportSession[],
  today: Day,
): LoadSuggestion {
  const S = pe.targetSets
  const R = pe.targetReps
  const [last, prev] = [...history]
    .sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt))
    .map((s) => ({ day: s.day, sets: s.sets.filter((x) => x.programExerciseId === pe.id).sort((a, b) => a.setIndex - b.setIndex) }))
    .filter((s) => s.sets.length > 0)
  if (!last) return { weightKg: 0, reps: R, trend: 'new', hint: null }

  const W = workingLoad(last.sets)
  // Les séries à la charge de travail : les échauffements et les séries d'essai isolées sont écartées.
  const work = last.sets.filter((s) => s.weightKg === W)
  const ok = (sets: SportSet[]) => sets.filter((s) => s.reps >= R).length >= S
  const lastTime = `dernière fois ${work.map((s) => s.reps).join('·')}`

  const days = daysBetween(last.day, today)
  if (days > LAYOFF_DAYS) {
    const weeks = Math.floor(days / 7)
    if (W === 0) return { weightKg: 0, reps: R, trend: 'down', hint: `Reprise en douceur après ${weeks} semaines` }
    const w = ease(W)
    return { weightKg: w, reps: R, trend: 'down', hint: `Reprise en douceur : ${kg(w)} kg après ${weeks} semaines` }
  }

  if (W === 0) {
    if (ok(work)) {
      const n = Math.max(...work.map((s) => s.reps)) + 1
      return { weightKg: 0, reps: n, trend: 'up', hint: `↑ ${n} reps aujourd'hui (${lastTime})` }
    }
    return { weightKg: 0, reps: R, trend: 'same', hint: `Vise ${S}×${R} (${lastTime})` }
  }

  if (ok(work)) {
    // Reps des S meilleures séries : une série en plus, ratée, ne fait pas baisser l'objectif.
    const min = work
      .map((s) => s.reps)
      .sort((a, b) => b - a)
      .slice(0, S)
      .at(-1)!
    if (W < LIGHT_KG && min < R + EXTRA_REPS) {
      const n = min + 1
      return { weightKg: W, reps: n, trend: 'up', hint: `↑ ${n} reps à ${kg(W)} kg aujourd'hui` }
    }
    const w = W + STEP
    return { weightKg: w, reps: R, trend: 'up', hint: `↑ ${kg(w)} kg aujourd'hui : tu as validé ${S}×${R} à ${kg(W)} kg` }
  }

  if (prev && workingLoad(prev.sets) === W && !ok(prev.sets.filter((s) => s.weightKg === W))) {
    const w = ease(W)
    return { weightKg: w, reps: R, trend: 'down', hint: `Décharge : ${kg(w)} kg pour repartir plus fort` }
  }

  return { weightKg: W, reps: R, trend: 'same', hint: `Vise ${S}×${R} à ${kg(W)} kg (${lastTime})` }
}
