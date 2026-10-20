/**
 * Moteur de progression (REFONTE §6, lot 2) : la prochaine cible de chaque exo, avec sa raison en une
 * phrase. Une proposition, toujours modifiable à l'écran.
 */
import { cleanBpm, playedBpm, type Done } from './history'
import type { Movement } from './model'

export interface Target {
  bpm?: number
  loadKg?: number
  reps?: number
  why: string
}

/** Pas de tempo et nombre de séances propres de suite pour monter. */
export const BPM_STEP = 4
export const CLEAN_STREAK = 3
/** Pas de charge de la double progression. */
const LOAD_STEP = { upper: 2.5, lower: 5 }

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`
const kg = (v: number) => `${v.toLocaleString('fr-FR')} kg`

/**
 * Guitare : propre 3 séances de suite au même tempo (ou plus vite) → +4 BPM, sinon le même tempo.
 * Sans historique : le BPM de départ de l'exo. L'ancien « tempo max » sert de point de départ sans compter comme propre.
 */
export function guitarTarget(history: Done[], startBpm: number): Target {
  const latest = history[0]
  if (!latest) return { bpm: startBpm, why: `Premier passage : on démarre à ${startBpm} bpm.` }
  const recent = history.slice(0, CLEAN_STREAK).map(cleanBpm)
  if (recent.length === CLEAN_STREAK && recent.every((b) => b !== null)) {
    const t = Math.min(...(recent as number[]))
    return { bpm: t + BPM_STEP, why: `Propre ${CLEAN_STREAK} séances de suite à ${t} bpm : on passe à ${t + BPM_STEP}.` }
  }
  const t = cleanBpm(latest) ?? playedBpm(latest) ?? startBpm
  let streak = 0
  while (streak < history.length && (cleanBpm(history[streak]) ?? 0) >= t) streak++
  const left = CLEAN_STREAK - streak
  return {
    bpm: t,
    why:
      streak === 0
        ? `Joue ${t} bpm proprement : ${CLEAN_STREAK} séances propres et on monte.`
        : `Encore ${plural(left, 'séance propre', 'séances propres')} à ${t} bpm pour monter.`,
  }
}

/**
 * Sport, double progression : haut de la fourchette atteint sur toutes les séries → +2,5 kg (haut du corps)
 * ou +5 kg (bas du corps) et retour au bas de la fourchette ; sinon même charge, une répétition de plus que
 * la série la plus faible. Au poids du corps : une répétition de plus. Durée, distance : pas de cible.
 */
export function sportTarget(history: Done[], m: Pick<Movement, 'metric' | 'body' | 'repRange'>): Target | null {
  if (m.metric === 'duration' || m.metric === 'distance') return null
  const [lo, hi] = m.repRange ?? [null, null]
  const latest = history[0]
  const sets = latest?.sets.filter((x) => x.reps !== undefined) ?? []
  if (sets.length === 0)
    return {
      reps: lo ?? undefined,
      why: m.metric === 'reps' ? 'Première fois : fais ce qui vient, proprement.' : 'Première fois : choisis une charge confortable.',
    }

  const load = Math.max(...sets.map((x) => x.loadKg ?? 0))
  const work = sets.filter((x) => (x.loadKg ?? 0) === load)
  const lowest = Math.min(...work.map((x) => x.reps!))
  if (m.metric === 'reps' || load === 0) return { loadKg: load, reps: lowest + 1, why: `Une répétition de plus que ta série la plus faible (${lowest}).` }
  if (lo === null || hi === null) return { loadKg: load, reps: lowest, why: `Même charge que la dernière fois (${kg(load)}).` }
  if (work.every((x) => x.reps! >= hi)) {
    const step = LOAD_STEP[m.body ?? 'upper']
    return { loadKg: load + step, reps: lo, why: `${hi} reps sur toutes les séries : +${kg(step)}, retour à ${lo} reps.` }
  }
  const reps = Math.min(hi, lowest + 1)
  return { loadKg: load, reps, why: `Même charge : vise ${reps} reps, jusqu'à ${hi} sur toutes les séries pour monter.` }
}
