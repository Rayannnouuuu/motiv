import { useMemo } from 'react'
import { useAppData } from '../../data/AppDataContext'
import { addDays, daysBetween, weekStart } from '../../domain/date'
import { combineMuscu, toMuscu } from '../../domain/marathon/combined'
import { feasibility } from '../../domain/marathon/feasibility'
import { generatePlan } from '../../domain/marathon/plan'
import { doneRuns, latestWeight } from '../../domain/marathon/runs'
import { RUNNER_TEMPLATE_ID } from '../../domain/marathon/strength'
import { nextProgram, rotation } from '../../domain/progression'

/**
 * Le profil, la faisabilité (jugée au début du plan) et le plan sport complet : les sorties du plan marathon et ta
 * muscu placées ensemble. Rien n'est stocké : tout se recalcule à chaque séance enregistrée, et chaque lundi.
 */
export function useMarathon() {
  const { data, v1, today } = useAppData()
  return useMemo(() => {
    const m = v1.profile.marathon
    if (!m) return null
    const weight = latestWeight(v1.measurements)?.kg ?? null
    const f = feasibility(m, weight, m.startedOn)
    const marathon = f.ok ? generatePlan(m, weight, doneRuns(v1.sessions), today) : null

    const programs = rotation(data.programs)
    const next = nextProgram(data.programs, data.sportSessions)
    const runner = data.programs.find((p) => p.id === RUNNER_TEMPLATE_ID)
    const muscuIds = new Set([...programs.map((p) => p.id), RUNNER_TEMPLATE_ID])
    const monday = weekStart(today)
    const muscu = data.sportSessions.filter((s) => muscuIds.has(s.programId) && s.day >= monday && s.day <= addDays(monday, 6))
    const plan = marathon
      ? combineMuscu(marathon, {
          rotation: programs.map(toMuscu),
          next: next ? programs.indexOf(next) : 0,
          doneThisWeek: muscu.length,
          doneToday: muscu.some((s) => s.day === today),
          runner: runner ? { ...toMuscu(runner), lower: true } : null,
          raceDay: m.race.day,
          today,
        })
      : null
    return { m, weight, f, plan, today, daysLeft: daysBetween(today, m.race.day) }
  }, [data, v1, today])
}
