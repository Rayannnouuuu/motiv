import { addDays } from '../../domain/date'
import { PHASE_LABELS, type Plan, type PlanWeek } from '../../domain/marathon/plan'
import { RUNNER_TEMPLATE_ID } from '../../domain/marathon/strength'
import type { Session } from '../../domain/model'
import { km } from '../marathon/format'

/** La semaine du plan en cours, si le plan a commencé et que la course n'est pas passée. */
export const currentWeek = (plan: Plan | null | undefined): PlanWeek | null => (plan && plan.weeks[plan.current]) || null

/** Sport de la semaine du plan : « 6 / 36 km · renfo 0 / 2 », et la part des kilomètres faite (0 à 1). */
export function planWeekProgress(w: PlanWeek, sessions: Session[]): { text: string; ratio: number } {
  const end = addDays(w.start, 6)
  const renfo = sessions.filter((s) => s.templateId === RUNNER_TEMPLATE_ID && s.day >= w.start && s.day <= end).length
  const done = w.doneKm ?? 0
  const text = `${km(done).replace(' km', '')} / ${km(w.km)}${w.strength.length > 0 ? ` · renfo ${renfo} / ${w.strength.length}` : ''}`
  return { text, ratio: w.km > 0 ? Math.min(1, done / w.km) : 0 }
}

/** Phase et semaine du plan : « Plan marathon · Base, semaine 7 sur 18 ». */
export const planWeekLabel = (plan: Plan) => {
  const w = plan.weeks[Math.min(Math.max(plan.current, 0), plan.weeks.length - 1)]
  return `${PHASE_LABELS[w.phase]} · semaine ${w.index + 1} sur ${plan.weeks.length}`
}
