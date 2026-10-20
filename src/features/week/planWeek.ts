import { addDays } from '../../domain/date'
import { PHASE_LABELS, type Plan, type PlanWeek } from '../../domain/marathon/plan'
import { runOf } from '../../domain/marathon/runs'
import type { Session } from '../../domain/model'
import { km } from '../marathon/format'

/** La semaine du plan en cours, si le plan a commencé et que la course n'est pas passée. */
export const currentWeek = (plan: Plan | null | undefined): PlanWeek | null => (plan && plan.weeks[plan.current]) || null

/** Séances de sport de la semaine, sorties et muscu à part. */
function weekSport(w: PlanWeek, sessions: Session[]) {
  const end = addDays(w.start, 6)
  const inWeek = sessions.filter((s) => s.discipline === 'sport' && s.day >= w.start && s.day <= end)
  const runs = inWeek.filter((s) => runOf(s))
  return { runs: runs.length, lifts: inWeek.length - runs.length }
}

/**
 * Objectif sport d'une semaine du plan complet : les sorties prévues, plus la muscu (faite cette semaine, et celle
 * qui reste à placer : le plan ne garde que les créneaux pas encore faits).
 */
export function planWeekCount(w: PlanWeek, sessions: Session[]): { done: number; goal: number } {
  const did = weekSport(w, sessions)
  const runs = w.runs.filter((r) => r.kind !== 'cross').length
  return { done: did.runs + did.lifts, goal: Math.max(runs, did.runs) + did.lifts + w.strength.length }
}

/** Sport de la semaine du plan : « 6 / 36 km · muscu 1 / 3 », et la part des kilomètres faite (0 à 1). */
export function planWeekProgress(w: PlanWeek, sessions: Session[]): { text: string; ratio: number } {
  const did = weekSport(w, sessions)
  const done = w.doneKm ?? 0
  const lifts = did.lifts + w.strength.length
  const text = `${km(done).replace(' km', '')} / ${km(w.km)}${lifts > 0 ? ` · muscu ${did.lifts} / ${lifts}` : ''}`
  return { text, ratio: w.km > 0 ? Math.min(1, done / w.km) : 0 }
}

/** Phase et semaine du plan : « Base · semaine 7 sur 18 ». */
export const planWeekLabel = (plan: Plan) => {
  const w = plan.weeks[Math.min(Math.max(plan.current, 0), plan.weeks.length - 1)]
  return `${PHASE_LABELS[w.phase]} · semaine ${w.index + 1} sur ${plan.weeks.length}`
}
