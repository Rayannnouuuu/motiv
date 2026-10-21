import { weekStart } from './date'
import type { DoneRun } from './marathon/plan'
import type { AppData, Challenge, Day } from './types'

export interface ChallengeProgress {
  current: number
  target: number
  unit: 'bpm' | 'kg' | 'reps' | 'séances' | 'morceau' | 'km'
}

/**
 * Où en est un défi, avec les mêmes règles que sa réussite (`isChallengeMet`) :
 * seuls les logs faits depuis la création du défi comptent.
 */
export function challengeProgress(ch: Challenge, data: AppData, today: Day, runs: DoneRun[] = []): ChallengeProgress {
  const t = ch.target
  const since = <T extends { day: Day }>(xs: T[]) => xs.filter((x) => x.day >= ch.createdOn)
  switch (t.kind) {
    case 'bpm': {
      let best = 0
      for (const s of since(data.guitarSessions))
        for (const it of s.items) if (it.kind === 'exercise' && it.exerciseId === t.exerciseId) best = Math.max(best, it.maxBpm ?? 0)
      return { current: best, target: t.bpm, unit: 'bpm' }
    }
    case 'weight': {
      let best = 0
      for (const s of since(data.sportSessions))
        for (const x of s.sets) if (x.programExerciseId === t.programExerciseId && x.reps >= t.reps) best = Math.max(best, x.weightKg)
      return { current: best, target: t.weightKg, unit: 'kg' }
    }
    case 'reps': {
      let best = 0
      for (const s of since(data.sportSessions))
        for (const x of s.sets) if (x.programExerciseId === t.programExerciseId && x.weightKg >= t.weightKg) best = Math.max(best, x.reps)
      return { current: best, target: t.reps, unit: 'reps' }
    }
    case 'sessionsInWeek': {
      const thisWeek = weekStart(today)
      const n = since(data.sportSessions).filter((s) => weekStart(s.day) === thisWeek).length
      return { current: Math.min(n, t.count), target: t.count, unit: 'séances' }
    }
    case 'song':
      return { current: data.songs.some((s) => s.id === t.songId && s.status === 'mastered') ? 1 : 0, target: 1, unit: 'morceau' }
    case 'longRun':
      return { current: Math.max(0, ...since(runs).map((r) => r.km)), target: t.km, unit: 'km' }
  }
}

/** Où aller pour travailler le défi. */
export function challengeRoute(ch: Challenge): string {
  switch (ch.target.kind) {
    case 'bpm':
      return `/exo/${ch.target.exerciseId}`
    case 'song':
      return '/log/guitare'
    case 'longRun':
      return '/course'
    default:
      return '/log/sport'
  }
}
