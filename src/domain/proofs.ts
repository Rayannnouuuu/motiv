/**
 * Preuves (lot 5) : enregistrements audio rattachés à un exo ou un morceau, photos de progression sport.
 * L'écran compare « il y a 30 jours » et « aujourd'hui » : la plus récente, et celle d'il y a un mois.
 */
import { addDays } from './date'
import type { Proof } from './model'
import type { Day } from './types'

export const COMPARE_DAYS = 30

/** Ce à quoi une preuve est rattachée : un morceau, un exo, ou les photos (un seul sujet). */
export const subjectOf = (p: Proof): string =>
  p.kind === 'photo' ? 'photo' : p.songId ? `song:${p.songId}` : p.exerciseId ? `exercise:${p.exerciseId}` : 'audio'

const newestFirst = (a: Proof, b: Proof) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt)

/** Les preuves d'un sujet, la plus récente d'abord. */
export const proofsOf = (proofs: Proof[], subject: string) => proofs.filter((p) => subjectOf(p) === subject).sort(newestFirst)

/** Les sujets audio, le plus récemment enregistré d'abord. */
export function audioSubjects(proofs: Proof[]): string[] {
  return [
    ...new Set(
      proofs
        .filter((p) => p.kind === 'audio')
        .sort(newestFirst)
        .map(subjectOf),
    ),
  ]
}

/**
 * La paire à comparer : `now` est la plus récente ; `then` celle d'il y a au moins 30 jours (la plus proche de
 * cette date), sinon la plus ancienne. Une seule preuve : rien à comparer encore.
 */
export function comparePair(proofs: Proof[], subject: string): { then: Proof | null; now: Proof | null; days: number | null } {
  const list = proofsOf(proofs, subject)
  const now = list[0] ?? null
  if (!now || list.length < 2) return { then: null, now, days: null }
  const limit = addDays(now.day, -COMPARE_DAYS)
  const then = list.find((p) => p.day <= limit) ?? list.at(-1)!
  return { then, now, days: Math.round((Date.parse(now.day) - Date.parse(then.day)) / 86_400_000) }
}

/** « il y a 32 jours », « le même jour ». */
export const gapLabel = (days: number) => (days === 0 ? 'le même jour' : days === 1 ? 'la veille' : `${days} jours avant`)

/** Prochaine preuve conseillée pour ce sujet : 30 jours après la dernière. */
export const nextDue = (proofs: Proof[], subject: string): Day | null => {
  const last = proofsOf(proofs, subject)[0]
  return last ? addDays(last.day, COMPARE_DAYS) : null
}
