import { addDays, weekStart } from './date'
import { SPORT_WEEKLY_SESSIONS, weekGoals } from './streak'
import type { AppData, Day, Domain } from './types'

/**
 * Niveaux (lot 4) : l'XP récompense la progression (records, morceau maîtrisé, semaine réussie, cycle atteint),
 * pas le temps brut. L'XP gagnée avant reste acquise : les niveaux ne peuvent que monter. Plus de défi bloquant.
 */
export const XP_PER_LEVEL = { guitar: 600, sport: 600 } as const
export const GLOBAL_XP_PER_LEVEL = 1200
/** Objectif de la semaine tenu, par discipline. */
export const XP_WEEK_GOAL = 100
/** Objectif phare d'un cycle de 6 semaines atteint. */
export const XP_CYCLE_GOAL = 300
/** Premier lundi des objectifs de la semaine : les bonus de semaine comptent à partir de là. */
export const WEEK_XP_FROM: Day = '2026-10-19'

export interface DomainLevel {
  level: number
  xpInLevel: number
  perLevel: number
  total: number
}

export function totalXp(sessions: { xp: number }[]): number {
  return sessions.reduce((t, s) => t + s.xp, 0)
}

export function domainLevel(domain: Domain, total: number): DomainLevel {
  const perLevel = XP_PER_LEVEL[domain]
  return { level: 1 + Math.floor(total / perLevel), xpInLevel: total % perLevel, perLevel, total }
}

export function globalLevel(guitar: number, sport: number): { level: number; xpInLevel: number; perLevel: number } {
  const xp = guitar + sport
  return { level: 1 + Math.floor(xp / GLOBAL_XP_PER_LEVEL), xpInLevel: xp % GLOBAL_XP_PER_LEVEL, perLevel: GLOBAL_XP_PER_LEVEL }
}

type Data = Pick<AppData, 'guitarSessions' | 'sportSessions'>

/** Bonus des semaines où l'objectif est tenu, de `WEEK_XP_FROM` à la semaine du jour (comptée si déjà tenue). */
export function weekBonusXp(data: Data, today: Day, sportGoalOf: (monday: Day) => number = () => SPORT_WEEKLY_SESSIONS): Record<Domain, number> {
  const out = { guitar: 0, sport: 0 }
  for (let w = WEEK_XP_FROM; w <= weekStart(today); w = addDays(w, 7)) {
    const g = weekGoals(data, w, sportGoalOf(w))
    if (g.guitar.done >= g.guitar.goal) out.guitar += XP_WEEK_GOAL
    if (g.sport.done >= g.sport.goal) out.sport += XP_WEEK_GOAL
  }
  return out
}

/** Niveaux guitare, sport et global. `extra` : XP calculée ailleurs (cycles atteints). */
export function allLevels(data: Data, today: Day, sportGoalOf?: (monday: Day) => number, extra: Record<Domain, number> = { guitar: 0, sport: 0 }) {
  const bonus = weekBonusXp(data, today, sportGoalOf)
  const guitar = domainLevel('guitar', totalXp(data.guitarSessions) + bonus.guitar + extra.guitar)
  const sport = domainLevel('sport', totalXp(data.sportSessions) + bonus.sport + extra.sport)
  return { guitar, sport, global: globalLevel(guitar.total, sport.total) }
}
