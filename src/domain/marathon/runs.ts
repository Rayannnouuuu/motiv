/**
 * Sorties de course (lot 3) : une séance sport avec le mouvement « course » de la bibliothèque (distance et
 * durée), et la douleur notée sur la séance.
 */
import type { Entry, Measurement, Session } from '../model'
import type { DoneRun } from './plan'

export const RUN_MOVEMENT_ID = 'course'

/** Une sortie du plan (pas une ligne « Course » d'un programme de musculation). */
export const isRunEntry = (e: Entry) => e.exerciseId === RUN_MOVEMENT_ID && e.templateEntryId === undefined

/** Distance et durée d'une séance, si c'est une sortie de course. */
export function runOf(s: Session): { km: number; sec: number } | null {
  const sets = s.blocks.flatMap((b) => b.entries.filter(isRunEntry).flatMap((e) => e.sets))
  if (sets.length === 0) return null
  return { km: sets.reduce((t, x) => t + (x.distanceKm ?? 0), 0), sec: sets.reduce((t, x) => t + (x.durationSec ?? 0), 0) }
}

/** Les sorties faites, pour adapter le plan. */
export function doneRuns(sessions: Session[]): DoneRun[] {
  return sessions.flatMap((s) => {
    const r = s.discipline === 'sport' ? runOf(s) : null
    return r ? [{ day: s.day, km: r.km, pain: s.pain ?? null }] : []
  })
}

/** Dernière pesée : le poids du profil suit les mesures. */
export function latestWeight(measurements: Measurement[]): { kg: number; day: string } | null {
  const m = [...measurements].filter((x) => x.weightKg !== null).sort((a, b) => (a.day < b.day ? 1 : -1))[0]
  return m ? { kg: m.weightKg!, day: m.day } : null
}

/**
 * Taille à proposer : les 183 cm notés en « tour de taille » le 13 oct. étaient la taille (journal du lot 1).
 * Un tour de taille de 120 cm ou plus est pris pour une taille, sans toucher à la mesure.
 */
export function heightHint(measurements: Measurement[]): number | null {
  return measurements.find((m) => m.waistCm !== null && m.waistCm >= 120)?.waistCm ?? null
}
