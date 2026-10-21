/**
 * Cycles de 6 semaines (lot 4) : un objectif phare par discipline, une barre d'avancement, un bilan de fin de cycle
 * (avant / après, records, ce que je garde). Les objectifs sont des défis sans niveau (`level` = numéro du cycle) ;
 * le cycle, lui, est rangé dans le profil. Pendant un plan marathon, l'objectif sport suit le plan : la plus longue
 * sortie prévue dans le cycle.
 */
import { generateGuitarTarget, generateSportTarget } from './challenges'
import { addDays, daysBetween, weekStart } from './date'
import type { Plan } from './marathon/plan'
import { bestBpm, isSportRecord, setsForExercise } from './records'
import type { AppData, Challenge, ChallengeTarget, Day, Domain } from './types'

export const CYCLE_WEEKS = 6
export const CYCLE_DAYS = CYCLE_WEEKS * 7

export interface Cycle {
  /** Lundi du début. */
  start: Day
  /** Objectifs phares (ids des défis). */
  guitar: string | null
  sport: string | null
  /** Bilan de fin de cycle. */
  review?: { at: Day; keep: string }
}

export const cycleEnd = (c: Cycle): Day => addDays(c.start, CYCLE_DAYS - 1)

/** Où en est-on : un cycle en cours (semaine 1 à 6), un cycle fini dont le bilan reste à faire, ou rien. */
export function cycleState(
  cycles: Cycle[] = [],
  today: Day,
): { kind: 'none' } | { kind: 'running'; cycle: Cycle; week: number; number: number } | { kind: 'review'; cycle: Cycle; number: number } {
  const last = cycles.at(-1)
  if (!last) return { kind: 'none' }
  const number = cycles.length
  if (today <= cycleEnd(last)) return { kind: 'running', cycle: last, week: Math.floor(Math.max(0, daysBetween(last.start, today)) / 7) + 1, number }
  return last.review ? { kind: 'none' } : { kind: 'review', cycle: last, number }
}

/** Plus longue sortie prévue par le plan pendant les 6 semaines qui commencent le lundi `start`. */
export function planLongRun(plan: Plan | null | undefined, start: Day): number | null {
  if (!plan) return null
  const end = addDays(start, CYCLE_DAYS - 1)
  const km = plan.weeks.flatMap((w) => w.runs).filter((r) => r.day >= start && r.day <= end && (r.kind === 'long' || r.kind === 'race'))
  return km.length > 0 ? Math.max(...km.map((r) => r.km)) : null
}

/**
 * Objectifs proposés pour un nouveau cycle : un objectif encore ouvert est repris tel quel ; sinon un objectif
 * à la portée (tempo, morceau, charge) ; pendant un plan marathon, la plus longue sortie prévue.
 */
export function proposeTargets(data: AppData, today: Day, rng: () => number, plan?: Plan | null): Record<Domain, ChallengeTarget> {
  const open = (d: Domain) => data.challenges.find((c) => c.domain === d && c.status === 'active')?.target
  const done = (d: Domain) => data.challenges.filter((c) => c.domain === d && c.status === 'done').map((c) => c.target)
  const longRun = planLongRun(plan, weekStart(today))
  return {
    guitar: open('guitar') ?? generateGuitarTarget(data, today, rng, done('guitar')),
    sport: longRun !== null ? { kind: 'longRun', km: longRun } : (open('sport') ?? generateSportTarget(data, today, rng, done('sport'))),
  }
}

/** Le défi d'un objectif de cycle : il part d'aujourd'hui ; une version plus facile peut être proposée après 14 jours. */
export const objective = (id: string, domain: Domain, target: ChallengeTarget, number: number, today: Day): Challenge => ({
  id,
  domain,
  level: number,
  target,
  easier: false,
  status: 'active',
  createdOn: today,
  blockedSince: today,
  doneOn: null,
  rerolls: 0,
})

/** Objectifs atteints pendant leur cycle : la base du bonus d'XP de cycle, par discipline. */
export function cyclesReached(cycles: Cycle[] = [], challenges: Challenge[]): Record<Domain, number> {
  const out = { guitar: 0, sport: 0 }
  for (const c of cycles)
    for (const d of ['guitar', 'sport'] as const) {
      const ch = challenges.find((x) => x.id === c[d])
      if (ch?.status === 'done' && ch.doneOn !== null && ch.doneOn <= cycleEnd(c)) out[d]++
    }
  return out
}

/** Records battus entre deux dates : tempos (guitare) et séries (sport), par exo. */
export function recordsBetween(data: AppData, from: Day, to: Day): Record<Domain, number> {
  const inRange = (d: Day) => d >= from && d <= to
  let guitar = 0
  const exercises = new Set(data.guitarSessions.flatMap((s) => s.items.flatMap((it) => (it.kind === 'exercise' ? [it.exerciseId] : []))))
  for (const id of exercises) {
    const before = bestBpm(
      data.guitarSessions.filter((s) => s.day < from),
      id,
    )
    const during = bestBpm(
      data.guitarSessions.filter((s) => inRange(s.day)),
      id,
    )
    if (during !== null && before !== null && during > before) guitar++
  }
  let sport = 0
  const ids = new Set(data.sportSessions.flatMap((s) => s.sets.map((x) => x.programExerciseId)))
  for (const id of ids) {
    const history = setsForExercise(
      data.sportSessions.filter((s) => s.day < from),
      id,
    )
    if (data.sportSessions.some((s) => inRange(s.day) && s.sets.some((x) => x.programExerciseId === id && isSportRecord(history, x)))) sport++
  }
  return { guitar, sport }
}
