/**
 * Rythme (lot 7) : à partir des attaques entendues au micro (instants, en secondes sur l'horloge audio), le tempo
 * réellement joué et sa stabilité. Logique pure, sans audio. Pas de placement par rapport aux clics : la latence
 * du téléphone (haut-parleur, micro) le fausserait de plusieurs dizaines de ms ; le tempo, lui, n'en dépend pas.
 */

/** ± 5 bpm autour de l'objectif : « dans le temps ». */
export const TOLERANCE_BPM = 5
/** Les 8 dernières attaques suffisent : la réponse suit ce qui se joue maintenant. */
const WINDOW = 8
/** Deux attaques à moins de 80 ms : la même note (rebond), pas une nouvelle. */
const MIN_IOI = 0.08
/** Plus de 2,5 temps sans rien : un silence, pas un intervalle. */
const MAX_BEATS = 2.5
/** Noires, croches, triolets, doubles, blanches : ce qu'un intervalle peut valoir en temps. */
const RATIOS = [0.25, 1 / 3, 0.5, 2 / 3, 1, 1.5, 2]
/** Aiguille en butée à ± 15 bpm. */
const NEEDLE_RANGE = 15

export type Verdict = 'on' | 'rush' | 'drag'

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/**
 * Durées d'un temps estimées à partir des intervalles entre attaques : chaque intervalle est ramené au temps
 * (croche = ½ temps, etc.) par la fraction la plus proche, comparée au tempo visé.
 */
export function beatPeriods(onsets: number[], targetBpm: number): number[] {
  const beat = 60 / targetBpm
  const recent = onsets.slice(-(WINDOW + 1))
  const out: number[] = []
  for (let i = 1; i < recent.length; i++) {
    const ioi = recent[i] - recent[i - 1]
    if (ioi < MIN_IOI || ioi > beat * MAX_BEATS) continue
    const r = RATIOS.reduce((best, x) => (Math.abs(ioi / beat - x) < Math.abs(ioi / beat - best) ? x : best))
    out.push(ioi / r)
  }
  return out
}

export interface RhythmRead {
  /** Tempo joué ; null tant qu'il n'y a pas assez d'attaques. */
  bpm: number | null
  verdict: Verdict | null
  /** -1 (traîne) à 1 (presse). */
  needle: number
  /** 0 à 4 barres : régularité des intervalles. */
  stable: number
}

/** Stabilité : variation des durées de temps (écart type / moyenne). */
export function stabilityBars(periods: number[]): number {
  if (periods.length < 3) return 0
  const mean = periods.reduce((t, x) => t + x, 0) / periods.length
  const cv = Math.sqrt(periods.reduce((t, x) => t + (x - mean) ** 2, 0) / periods.length) / mean
  return cv < 0.03 ? 4 : cv < 0.06 ? 3 : cv < 0.1 ? 2 : 1
}

export function readRhythm(onsets: number[], targetBpm: number): RhythmRead {
  const periods = beatPeriods(onsets, targetBpm)
  if (periods.length < 3) return { bpm: null, verdict: null, needle: 0, stable: 0 }
  const bpm = Math.round(60 / median(periods))
  const diff = bpm - targetBpm
  return {
    bpm,
    verdict: Math.abs(diff) <= TOLERANCE_BPM ? 'on' : diff > 0 ? 'rush' : 'drag',
    needle: Math.max(-1, Math.min(1, diff / NEEDLE_RANGE)),
    stable: stabilityBars(periods),
  }
}

/** Régularité de la séance : part des lectures « dans le temps ». */
export const consistency = (verdicts: Verdict[]) =>
  verdicts.length === 0 ? null : Math.round((verdicts.filter((v) => v === 'on').length / verdicts.length) * 100)
