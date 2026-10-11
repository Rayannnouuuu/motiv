import type { AppData, Challenge, Domain } from './types'

export const XP_PER_LEVEL = { guitar: 1200, sport: 600 } as const
export const GLOBAL_XP_PER_LEVEL = 1800

export interface DomainLevel {
  level: number
  xpInLevel: number
  perLevel: number
  blocked: boolean
  reserve: number
  unlockedXp: number
}

export function totalXp(sessions: { xp: number }[]): number {
  return sessions.reduce((t, s) => t + s.xp, 0)
}

/** Niveau d'un domaine avec blocage au seuil tant que le défi du niveau n'est pas réussi (spec §6.5). */
export function domainLevel(domain: Domain, total: number, challenges: Challenge[]): DomainLevel {
  const perLevel = XP_PER_LEVEL[domain]
  const doneLevels = new Set(challenges.filter((c) => c.domain === domain && c.status === 'done').map((c) => c.level))

  let level = 1
  while (total >= level * perLevel && doneLevels.has(level)) level++

  const reserve = Math.max(0, total - level * perLevel)
  return {
    level,
    xpInLevel: Math.min(total - (level - 1) * perLevel, perLevel),
    perLevel,
    blocked: total >= level * perLevel,
    reserve,
    unlockedXp: total - reserve,
  }
}

export function globalLevel(unlockedGuitar: number, unlockedSport: number): { level: number; xpInLevel: number; perLevel: number } {
  const xp = unlockedGuitar + unlockedSport
  return {
    level: 1 + Math.floor(xp / GLOBAL_XP_PER_LEVEL),
    xpInLevel: xp % GLOBAL_XP_PER_LEVEL,
    perLevel: GLOBAL_XP_PER_LEVEL,
  }
}

export function allLevels(data: Pick<AppData, 'guitarSessions' | 'sportSessions' | 'challenges'>) {
  const guitar = domainLevel('guitar', totalXp(data.guitarSessions), data.challenges)
  const sport = domainLevel('sport', totalXp(data.sportSessions), data.challenges)
  return { guitar, sport, global: globalLevel(guitar.unlockedXp, sport.unlockedXp) }
}
