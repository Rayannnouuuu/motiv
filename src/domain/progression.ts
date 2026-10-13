import {
  canOfferEasier,
  canReroll,
  easierTarget,
  generateGuitarTarget,
  generateSportTarget,
  isChallengeMet,
  sameTarget,
} from './challenges'
import { domainLevel, totalXp } from './levels'
import type { AppData, Challenge, ChallengeTarget, Day, Domain, Program, SportSession } from './types'

export type ChallengeUpdate =
  | { type: 'markDone'; id: string; doneOn: Day }
  | { type: 'setBlockedSince'; id: string; day: Day }
  | { type: 'create'; challenge: Challenge }
  | { type: 'replace'; id: string } // statut → 'replaced'

export interface Deps {
  rng: () => number
  newId: () => string
}

const DOMAINS: Domain[] = ['guitar', 'sport']
const MAX_SETTLE_ROUNDS = 5

const sessionsOf = (data: AppData, domain: Domain) => (domain === 'guitar' ? data.guitarSessions : data.sportSessions)

const generate = (domain: Domain, data: AppData, today: Day, rng: () => number, exclude: ChallengeTarget[]) =>
  domain === 'guitar' ? generateGuitarTarget(data, today, rng, exclude) : generateSportTarget(data, today, rng, exclude)

export function applyChallengeUpdates(challenges: Challenge[], updates: ChallengeUpdate[]): Challenge[] {
  let out = challenges
  for (const u of updates) {
    if (u.type === 'create') out = [...out, u.challenge]
    else
      out = out.map((c) => {
        if (c.id !== u.id) return c
        if (u.type === 'markDone') return { ...c, status: 'done', doneOn: u.doneOn }
        if (u.type === 'replace') return { ...c, status: 'replaced' }
        return { ...c, blockedSince: u.day }
      })
  }
  return out
}

export function planChallengeUpdates(data: AppData, today: Day, deps: Deps): ChallengeUpdate[] {
  const updates: ChallengeUpdate[] = data.challenges
    .filter((c) => c.status === 'active' && isChallengeMet(c, data))
    .map((c) => ({ type: 'markDone', id: c.id, doneOn: today }))
  const challenges = applyChallengeUpdates(data.challenges, updates)

  for (const domain of DOMAINS) {
    const lvl = domainLevel(domain, totalXp(sessionsOf(data, domain)), challenges)
    const atLevel = challenges.filter((c) => c.domain === domain && c.level === lvl.level && c.status !== 'replaced')
    if (atLevel.length === 0) {
      // Pas deux fois le même défi : les cibles déjà réussies dans ce domaine sont exclues.
      const done = challenges.filter((c) => c.domain === domain && c.status === 'done').map((c) => c.target)
      updates.push({
        type: 'create',
        challenge: {
          id: deps.newId(),
          domain,
          level: lvl.level,
          target: generate(domain, data, today, deps.rng, done),
          easier: false,
          status: 'active',
          createdOn: today,
          blockedSince: lvl.blocked ? today : null,
          doneOn: null,
          rerolls: 0,
        },
      })
      continue
    }
    const active = atLevel.find((c) => c.status === 'active')
    if (lvl.blocked && active && active.blockedSince === null) updates.push({ type: 'setBlockedSince', id: active.id, day: today })
  }
  return updates
}

/** Applique plan/apply jusqu'à stabilité (un défi réussi peut débloquer un niveau, qui crée un défi). */
export function settleChallenges(data: AppData, today: Day, deps: Deps): ChallengeUpdate[] {
  const all: ChallengeUpdate[] = []
  let current = data
  for (let round = 0; round < MAX_SETTLE_ROUNDS; round++) {
    const updates = planChallengeUpdates(current, today, deps)
    if (updates.length === 0) break
    all.push(...updates)
    current = { ...current, challenges: applyChallengeUpdates(current.challenges, updates) }
  }
  return all
}

/** Le nouveau défi part d'aujourd'hui : les logs d'avant ne le valident pas d'office. */
function replaceWith(ch: Challenge, target: ChallengeTarget, over: Partial<Challenge>, today: Day, deps: Deps): ChallengeUpdate[] {
  return [
    { type: 'replace', id: ch.id },
    { type: 'create', challenge: { ...ch, id: deps.newId(), target, status: 'active', doneOn: null, createdOn: today, ...over } },
  ]
}

export function rerollChallenge(data: AppData, id: string, today: Day, deps: Deps): ChallengeUpdate[] {
  const ch = data.challenges.find((c) => c.id === id)
  if (!ch || !canReroll(ch)) return []
  const exclude = data.challenges.filter((c) => c.domain === ch.domain && c.level === ch.level).map((c) => c.target)
  const target = generate(ch.domain, data, today, deps.rng, exclude)
  if (exclude.some((t) => sameTarget(t, target))) return []
  return replaceWith(ch, target, { rerolls: ch.rerolls + 1 }, today, deps)
}

export function acceptEasier(data: AppData, id: string, today: Day, deps: Deps): ChallengeUpdate[] {
  const ch = data.challenges.find((c) => c.id === id)
  if (!ch || !canOfferEasier(ch, today)) return []
  return replaceWith(ch, easierTarget(ch.target)!, { easier: true }, today, deps)
}

export function nextProgram(programs: Program[], sessions: SportSession[]): Program | undefined {
  const active = programs.filter((p) => !p.archived).sort((a, b) => a.position - b.position)
  if (active.length === 0) return undefined
  const last = [...sessions].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1)
  const idx = last ? active.findIndex((p) => p.id === last.programId) : -1
  return idx === -1 ? active[0] : active[(idx + 1) % active.length]
}

/** Les `n` prochaines séances dans la rotation (la première est `nextProgram`). */
export function upcomingPrograms(programs: Program[], sessions: SportSession[], n: number): Program[] {
  const active = programs.filter((p) => !p.archived).sort((a, b) => a.position - b.position)
  const first = nextProgram(programs, sessions)
  if (!first) return []
  const start = active.indexOf(first)
  return Array.from({ length: Math.min(n, active.length) }, (_, i) => active[(start + i) % active.length])
}
