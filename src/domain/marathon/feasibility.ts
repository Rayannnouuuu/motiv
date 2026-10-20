/**
 * Faisabilité (lot 3), avant de générer quoi que ce soit : les semaines jusqu'à la course face au niveau.
 * Délai trop court : un refus franc et 3 options, jamais un plan risqué pour tenir une date.
 */
import { addDays, daysBetween, weekStart } from '../date'
import type { Day } from '../types'
import { bmi, isCautious, LEVEL_LABELS, RACE_LABELS, runnerLevel, type MarathonProfile, type RaceKind, type RunnerLevel, type Thresholds } from './profile'

export type FeasibilityOption =
  | { kind: 'walkRun'; available: boolean; minWeeks: number; why: string }
  | { kind: 'half'; available: boolean; minWeeks: number; why: string }
  | { kind: 'later'; day: Day; why: string }

export interface Feasibility {
  ok: boolean
  /** Semaines de plan, celle de la course comprise. */
  weeks: number
  minWeeks: number
  idealWeeks: number
  level: RunnerLevel
  cautious: boolean
  bmi: number | null
  walkRun: boolean
  /** L'explication, phrase par phrase. */
  reasons: string[]
  options: FeasibilityOption[]
  /** Toujours affiché avant de démarrer. */
  medical: string
}

/** Semaines de plan entre la semaine de `today` et celle de la course (incluses). */
export const planWeeks = (today: Day, raceDay: Day) => Math.floor(daysBetween(weekStart(today), weekStart(raceDay)) / 7) + 1

/** Minimum et idéal en semaines pour un niveau, une distance et un mode. */
export function weeksNeeded(t: Thresholds, level: RunnerLevel, kind: RaceKind, walkRun: boolean, cautious: boolean): { min: number; ideal: number } {
  const extra = cautious ? t.cautiousExtraWeeks : 0
  if (kind === 'half') {
    const min = { experienced: 8, regular: 10, beginner: 12 }[level] + Math.ceil(extra / 2)
    return { min, ideal: min + 2 }
  }
  if (walkRun && level !== 'beginner') return { min: 16 + extra, ideal: 20 + extra }
  const min = { experienced: t.experiencedMinWeeks, regular: t.regularMinWeeks, beginner: t.beginnerMinWeeks }[level] + extra
  const ideal = { experienced: t.experiencedIdealWeeks, regular: t.regularMinWeeks + 4, beginner: t.beginnerMinWeeks + 4 }[level] + extra
  return { min, ideal: Math.max(min, ideal) }
}

const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`

export function feasibility(p: MarathonProfile, weightKg: number | null, today: Day): Feasibility {
  const level = runnerLevel(p.level)
  const cautious = isCautious(p, weightKg)
  const b = bmi(p.body.heightCm, weightKg)
  const walkRun = p.walkRun || level === 'beginner'
  const weeks = planWeeks(today, p.race.day)
  const { min, ideal } = weeksNeeded(p.thresholds, level, p.race.kind, walkRun, cautious)
  const race = RACE_LABELS[p.race.kind].toLowerCase()

  const reasons = [
    `Niveau ${LEVEL_LABELS[level]} : ${p.level.weeklyKm} km par semaine, plus longue sortie ${p.level.longestKm} km.`,
    `${plural(weeks, 'semaine')} jusqu'à la course ; il en faut au moins ${min} pour un ${race}${walkRun ? ' en course-marche' : ''}.`,
  ]
  if (cautious) {
    const why = [b !== null && b >= p.thresholds.bmiCautious && `IMC ${b.toLocaleString('fr-FR')}`, p.health.pains.trim() && 'douleur signalée']
      .filter(Boolean)
      .join(' et ')
    reasons.push(`Mode prudent (${why}) : plus de course-marche, volume qui monte plus lentement, vélo ou marche en complément.`)
  }
  if (weeks <= 0) reasons.splice(1, 1, 'La date de course est passée.')

  const medical =
    level === 'beginner' || cautious
      ? 'Avant de démarrer, demande un avis médical : tu pars de peu de pratique ou avec un point de vigilance.'
      : 'Un avis médical avant une préparation marathon reste conseillé.'

  if (weeks >= min) {
    if (weeks < ideal) reasons.push(`C'est faisable, mais serré : ${ideal} semaines seraient plus confortables.`)
    return { ok: true, weeks, minWeeks: min, idealWeeks: ideal, level, cautious, bmi: b, walkRun, reasons, options: [], medical }
  }

  // Trop court : les 3 alternatives, avec leur propre minimum.
  const wr = weeksNeeded(p.thresholds, level, 'marathon', true, cautious)
  const half = weeksNeeded(p.thresholds, level, 'half', walkRun, cautious)
  const laterDay = addDays(weekStart(today), (min - 1) * 7 + 6)
  const options: FeasibilityOption[] = []
  if (p.race.kind === 'marathon' && !walkRun)
    options.push({
      kind: 'walkRun',
      available: weeks >= wr.min,
      minWeeks: wr.min,
      why:
        weeks >= wr.min
          ? 'Finir en alternant course et marche : moins de chocs, même date.'
          : `Course-marche : ${wr.min} semaines au minimum, il en manque ${wr.min - weeks}.`,
    })
  if (p.race.kind === 'marathon')
    options.push({
      kind: 'half',
      available: weeks >= half.min,
      minWeeks: half.min,
      why: weeks >= half.min ? 'Viser un semi-marathon à cette date.' : `Semi-marathon : ${half.min} semaines au minimum, il en manque ${half.min - weeks}.`,
    })
  options.push({ kind: 'later', day: laterDay, why: `Choisir une course à partir du ${laterDay.split('-').reverse().join('/')}.` })
  reasons.push(`Il manque ${plural(min - Math.max(weeks, 0), 'semaine')} : je ne génère pas de plan risqué pour tenir cette date.`)
  return { ok: false, weeks, minWeeks: min, idealWeeks: ideal, level, cautious, bmi: b, walkRun, reasons, options, medical }
}
