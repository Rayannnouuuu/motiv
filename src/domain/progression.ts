import { canOfferEasier, canReroll, easierTarget, generateGuitarTarget, generateSportTarget, isChallengeMet, sameTarget } from './challenges'
import type { DoneRun } from './marathon/plan'
import { RUNNER_TEMPLATE_ID } from './marathon/strength'
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

/**
 * Objectifs atteints (lot 4) : un objectif actif rempli passe « réussi » ce jour-là. Plus de défi par niveau ni de
 * blocage : les objectifs naissent avec les cycles de 6 semaines.
 */
export function planChallengeUpdates(data: AppData, today: Day, runs: DoneRun[] = []): ChallengeUpdate[] {
  return data.challenges.filter((c) => c.status === 'active' && isChallengeMet(c, data, runs)).map((c) => ({ type: 'markDone', id: c.id, doneOn: today }))
}

export function settleChallenges(data: AppData, today: Day, runs: DoneRun[] = []): ChallengeUpdate[] {
  return planChallengeUpdates(data, today, runs)
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

/** Programmes de la rotation : actifs, hors renfo coureur du plan marathon (il a ses propres jours). */
/** Ta rotation de muscu (Push / Pull / Legs…), dans l'ordre ; le renfo coureur n'en fait pas partie. */
export const rotation = (programs: Program[]) => programs.filter((p) => !p.archived && p.id !== RUNNER_TEMPLATE_ID).sort((a, b) => a.position - b.position)

export function nextProgram(programs: Program[], sessions: SportSession[]): Program | undefined {
  const active = rotation(programs)
  if (active.length === 0) return undefined
  // Une sortie de course ou un renfo coureur ne fait pas repartir la rotation au début.
  const last = sessions
    .filter((s) => active.some((p) => p.id === s.programId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .at(-1)
  const idx = last ? active.findIndex((p) => p.id === last.programId) : -1
  return idx === -1 ? active[0] : active[(idx + 1) % active.length]
}

/** Les `n` prochaines séances dans la rotation (la première est `nextProgram`). */
export function upcomingPrograms(programs: Program[], sessions: SportSession[], n: number): Program[] {
  const active = rotation(programs)
  const first = nextProgram(programs, sessions)
  if (!first) return []
  const start = active.indexOf(first)
  return Array.from({ length: Math.min(n, active.length) }, (_, i) => active[(start + i) % active.length])
}
