import { isSportRecord } from './records'
import type { Challenge, ChallengeTarget, SportSet } from './types'

/** Défi qu'une seule série peut remplir : une charge ou des reps sur un exo. */
export type SetTarget = Extract<ChallengeTarget, { kind: 'weight' | 'reps' }>
export type SetChallenge = Challenge & { target: SetTarget }

const isSetChallenge = (c: Challenge): c is SetChallenge => c.target.kind === 'weight' || c.target.kind === 'reps'

/** Défi sport actif de type charge ou reps sur cet exo, ou null. */
export function activeSetChallenge(challenges: Challenge[], programExerciseId: string): SetChallenge | null {
  return (
    challenges.find(
      (c): c is SetChallenge => c.domain === 'sport' && c.status === 'active' && isSetChallenge(c) && c.target.programExerciseId === programExerciseId,
    ) ?? null
  )
}

/** Même règle qu'`isChallengeMet` : charge ≥ et reps ≥ la cible. */
export function meetsChallenge(target: SetTarget, set: Pick<SportSet, 'weightKg' | 'reps'>): boolean {
  return set.weightKg >= target.weightKg && set.reps >= target.reps
}

/**
 * Record à fêter tout de suite : la série bat l'historique, et aucune série record déjà faite dans la séance
 * ne la vaut (charge ≥ et reps ≥). Un échauffement léger compté comme record n'empêche donc pas de fêter la
 * vraie série lourde ; refaire la même série record ne refête pas.
 */
export function isNewRecord(historySets: SportSet[], sessionSetsOfExo: SportSet[], set: SportSet): boolean {
  return isSportRecord(historySets, set) && !sessionSetsOfExo.some((s) => isSportRecord(historySets, s) && s.weightKg >= set.weightKg && s.reps >= set.reps)
}
