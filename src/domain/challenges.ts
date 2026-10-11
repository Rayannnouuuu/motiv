import { getExercise, nextInCategory } from '../content/exercises'
import { addDays, daysBetween, weekStart } from './date'
import { bestBpm, setsForExercise } from './records'
import type { AppData, Challenge, ChallengeTarget, Day } from './types'

export const RECENT_DAYS = 14
export const MAX_REROLLS = 2
export const EASIER_AFTER_DAYS = 14

const FALLBACK_SPORT: ChallengeTarget = { kind: 'sessionsInWeek', count: 3 }

export function roundEven(x: number): number {
  return Math.round(x / 2) * 2
}

const sameTarget = (a: ChallengeTarget, b: ChallengeTarget) => JSON.stringify(a) === JSON.stringify(b)

/** Premier groupe non vide après exclusion, un candidat tiré au hasard ; sinon le repli. */
function pick(groups: ChallengeTarget[][], exclude: ChallengeTarget[], rng: () => number, fallback: ChallengeTarget) {
  for (const group of groups) {
    const left = group.filter((t) => !exclude.some((x) => sameTarget(x, t)))
    if (left.length > 0) return left[Math.min(left.length - 1, Math.floor(rng() * left.length))]
  }
  return fallback
}

const isRecent = (day: Day, today: Day) => day >= addDays(today, -(RECENT_DAYS - 1)) && day <= today

export function generateGuitarTarget(data: AppData, today: Day, rng: () => number, exclude: ChallengeTarget[]): ChallengeTarget {
  const recentIds: string[] = []
  const sessions = [...data.guitarSessions].sort((a, b) => b.day.localeCompare(a.day))
  for (const s of sessions) {
    if (!isRecent(s.day, today)) continue
    for (const it of s.items)
      if (it.kind === 'exercise' && getExercise(it.exerciseId) && !recentIds.includes(it.exerciseId)) recentIds.push(it.exerciseId)
  }

  const rule1: ChallengeTarget[] = []
  const rule2: ChallengeTarget[] = []
  for (const id of recentIds) {
    const e = getExercise(id)!
    const best = bestBpm(data.guitarSessions, id)
    if (best === null) continue
    if (best < e.targetBpm) {
      rule1.push({ kind: 'bpm', exerciseId: id, bpm: Math.min(Math.max(best + 2, roundEven(best * 1.1)), e.targetBpm), baseline: best })
    } else {
      const next = nextInCategory(e)
      const nextBest = next ? bestBpm(data.guitarSessions, next.id) : null
      if (next && (nextBest === null || nextBest < next.targetBpm))
        rule2.push({ kind: 'bpm', exerciseId: next.id, bpm: next.targetBpm, baseline: nextBest })
    }
  }
  const rule3: ChallengeTarget[] = data.songs.filter((s) => s.status === 'learning').map((s) => ({ kind: 'song', songId: s.id }))

  const scales1 = getExercise('scales-1')!
  const fallback: ChallengeTarget = { kind: 'bpm', exerciseId: scales1.id, bpm: scales1.targetBpm, baseline: null }
  return pick([rule1, rule2, rule3], exclude, rng, fallback)
}

export function generateSportTarget(data: AppData, today: Day, rng: () => number, exclude: ChallengeTarget[]): ChallengeTarget {
  const active = data.programs
    .filter((p) => !p.archived)
    .flatMap((p) => p.exercises.filter((e) => !e.archived))
    .map((e) => e.id)
  const recent = data.sportSessions.filter((s) => isRecent(s.day, today))
  const candidates: ChallengeTarget[] = []
  for (const id of active) {
    if (setsForExercise(recent, id).length === 0) continue
    const all = setsForExercise(data.sportSessions, id)
    const bestWeight = Math.max(...all.map((s) => s.weightKg))
    const repsAtBest = Math.max(...all.filter((s) => s.weightKg === bestWeight).map((s) => s.reps))
    if (bestWeight > 0)
      candidates.push({ kind: 'weight', programExerciseId: id, reps: repsAtBest, weightKg: bestWeight + 2.5, baseline: bestWeight })
    candidates.push({ kind: 'reps', programExerciseId: id, weightKg: bestWeight, reps: repsAtBest + 2, baseline: repsAtBest })
  }
  return pick([candidates], exclude, rng, FALLBACK_SPORT)
}

export function isChallengeMet(ch: Challenge, data: AppData): boolean {
  const t = ch.target
  switch (t.kind) {
    case 'bpm':
      return data.guitarSessions.some(
        (s) => s.day >= ch.createdOn && s.items.some((it) => it.kind === 'exercise' && it.exerciseId === t.exerciseId && (it.maxBpm ?? 0) >= t.bpm),
      )
    case 'song':
      return data.songs.some((s) => s.id === t.songId && s.status === 'mastered')
    case 'weight':
    case 'reps':
      return data.sportSessions.some(
        (s) =>
          s.day >= ch.createdOn &&
          s.sets.some((x) => x.programExerciseId === t.programExerciseId && x.weightKg >= t.weightKg && x.reps >= t.reps),
      )
    case 'sessionsInWeek': {
      const perWeek = new Map<Day, number>()
      for (const s of data.sportSessions)
        if (s.day >= ch.createdOn) perWeek.set(weekStart(s.day), (perWeek.get(weekStart(s.day)) ?? 0) + 1)
      return [...perWeek.values()].some((n) => n >= t.count)
    }
  }
}

export function easierTarget(t: ChallengeTarget): ChallengeTarget | null {
  switch (t.kind) {
    case 'bpm':
      return {
        ...t,
        bpm: t.baseline === null ? roundEven(t.bpm * 0.9) : Math.min(t.bpm, Math.max(t.baseline + 2, roundEven(t.baseline * 1.05))),
      }
    case 'weight':
      return { ...t, weightKg: t.baseline + 1.25 }
    case 'reps':
      return { ...t, reps: t.baseline + 1 }
    default:
      return null
  }
}

export function canOfferEasier(ch: Challenge, today: Day): boolean {
  return (
    ch.status === 'active' &&
    !ch.easier &&
    ch.blockedSince !== null &&
    daysBetween(ch.blockedSince, today) >= EASIER_AFTER_DAYS &&
    easierTarget(ch.target) !== null
  )
}

export function canReroll(ch: Challenge): boolean {
  return ch.status === 'active' && ch.rerolls < MAX_REROLLS
}

export function formatKg(kg: number): string {
  return String(kg).replace('.', ',')
}

export function describeTarget(t: ChallengeTarget, data: AppData): string {
  const exoName = (id: string) =>
    data.programs.flatMap((p) => p.exercises).find((e) => e.id === id)?.name ?? 'Exo inconnu'
  switch (t.kind) {
    case 'bpm':
      return `${getExercise(t.exerciseId)?.title ?? 'Exo inconnu'} à ${t.bpm} bpm`
    case 'song':
      return `Maîtriser « ${data.songs.find((s) => s.id === t.songId)?.title ?? 'morceau inconnu'} »`
    case 'weight':
    case 'reps':
      return `${exoName(t.programExerciseId)} : ${t.reps} reps ${t.weightKg === 0 ? 'au poids du corps' : `à ${formatKg(t.weightKg)} kg`}`
    case 'sessionsInWeek':
      return `${t.count} séances de sport dans la même semaine`
  }
}
