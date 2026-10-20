import { useMemo } from 'react'
import { useAppData } from '../../data/AppDataContext'
import { daysBetween } from '../../domain/date'
import { feasibility } from '../../domain/marathon/feasibility'
import { generatePlan } from '../../domain/marathon/plan'
import { doneRuns, latestWeight } from '../../domain/marathon/runs'

/**
 * Le profil, la faisabilité (jugée au début du plan) et le plan du jour. Rien n'est stocké : tout se recalcule
 * à chaque sortie enregistrée, et chaque lundi.
 */
export function useMarathon() {
  const { v1, today } = useAppData()
  return useMemo(() => {
    const m = v1.profile.marathon
    if (!m) return null
    const weight = latestWeight(v1.measurements)?.kg ?? null
    const f = feasibility(m, weight, m.startedOn)
    const plan = f.ok ? generatePlan(m, weight, doneRuns(v1.sessions), today) : null
    return { m, weight, f, plan, today, daysLeft: daysBetween(today, m.race.day) }
  }, [v1, today])
}
