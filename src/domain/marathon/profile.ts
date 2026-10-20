/**
 * Profil marathon (REFONTE §6, lot 3) : ce que le questionnaire demande, et les repères de faisabilité,
 * modifiables. Rangé dans la ligne `profile` (champ `marathon`) : pas de table à part.
 */
import type { Day } from '../types'

export type Sex = 'f' | 'm'
/** 0 = lundi … 6 = dimanche. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type RaceKind = 'marathon' | 'half'
export type ChronoDistance = '5k' | '10k' | 'half'

export const RACE_KM: Record<RaceKind, number> = { marathon: 42.195, half: 21.0975 }
export const CHRONO_KM: Record<ChronoDistance, number> = { '5k': 5, '10k': 10, half: 21.0975 }
export const RACE_LABELS: Record<RaceKind, string> = { marathon: 'Marathon', half: 'Semi-marathon' }
export const CHRONO_LABELS: Record<ChronoDistance, string> = { '5k': '5 km', '10k': '10 km', half: 'Semi' }
export const WEEKDAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const

/** Repères de faisabilité (en semaines, course comprise) et seuil d'IMC du mode prudent. */
export interface Thresholds {
  experiencedMinWeeks: number
  experiencedIdealWeeks: number
  regularMinWeeks: number
  beginnerMinWeeks: number
  cautiousExtraWeeks: number
  bmiCautious: number
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  experiencedMinWeeks: 12,
  experiencedIdealWeeks: 16,
  regularMinWeeks: 20,
  beginnerMinWeeks: 26,
  cautiousExtraWeeks: 4,
  bmiCautious: 30,
}

export interface Chrono {
  distance: ChronoDistance
  sec: number
  day: Day
}

export interface MarathonProfile {
  race: { name: string; day: Day; kind: RaceKind; goalSec: number | null }
  /** Finir en alternant course et marche (option proposée quand le délai est court, d'office pour un débutant). */
  walkRun: boolean
  /** Le poids vient des pesées (mesures), pas d'ici. */
  body: { heightCm: number | null; birthYear: number | null; sex: Sex | null }
  level: { weeklyKm: number; longestKm: number; years: number; chrono: Chrono | null }
  constraints: { days: Weekday[]; longRunDay: Weekday; gym: boolean }
  health: { pains: string; hrMax: number | null; hrRest: number | null }
  thresholds: Thresholds
  /** Lundi de la semaine où le plan a été (re)généré : l'historique d'avant est gardé, le plan repart de là. */
  startedOn: Day
  /** Lundis des semaines déclarées « malade ». */
  sickWeeks: Day[]
  /** Jours précis où tu n'es pas disponible (ni course ni muscu). Facultatif : absent des profils d'avant. */
  offDays?: Day[]
}

export type RunnerLevel = 'experienced' | 'regular' | 'beginner'

export const LEVEL_LABELS: Record<RunnerLevel, string> = { experienced: 'confirmé', regular: 'régulier', beginner: 'débutant ou reprise' }

/** Confirmé : 30 km par semaine et une sortie de 15 km. Régulier : au moins 10 km par semaine. Sinon débutant ou reprise. */
export function runnerLevel(l: Pick<MarathonProfile['level'], 'weeklyKm' | 'longestKm'>): RunnerLevel {
  if (l.weeklyKm >= 30 && l.longestKm >= 15) return 'experienced'
  if (l.weeklyKm >= 10) return 'regular'
  return 'beginner'
}

/** IMC à une décimale, null sans taille ou sans pesée. */
export function bmi(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg) return null
  return Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10
}

/** Mode prudent : IMC au-dessus du seuil, ou une douleur signalée. */
export function isCautious(p: MarathonProfile, weightKg: number | null): boolean {
  return (bmi(p.body.heightCm, weightKg) ?? 0) >= p.thresholds.bmiCautious || p.health.pains.trim() !== ''
}

/** Le jour de la semaine (0 = lundi). */
export const weekdayOf = (day: Day): Weekday => ((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7) as Weekday
