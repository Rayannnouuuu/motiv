import { EXERCISES, getExercise } from '../content/exercises'
import { addDays, daysBetween, weekStart } from './date'
import { bestBpm, maxDifficultyByCategory, setsForExercise } from './records'
import type { ExerciseCategory } from '../content/exercises'
import type { AppData, Challenge, ChallengeTarget, Day } from './types'

export const RECENT_DAYS = 14
export const MAX_REROLLS = 2
export const EASIER_AFTER_DAYS = 14

/** Sans historique : une semaine au-dessus de l'objectif habituel (3). */
const FALLBACK_SPORT: ChallengeTarget = { kind: 'sessionsInWeek', count: 4 }
/** Défis sport : +5 kg aux mêmes reps, ou +3 reps à la même charge. */
const WEIGHT_STEP = 5
const REPS_STEP = 3

export function roundEven(x: number): number {
  return Math.round(x / 2) * 2
}

/** Clés triées : un objectif relu du serveur (jsonb réordonne les clés) reste égal à celui qu'on vient de générer. */
const canon = (t: ChallengeTarget) => JSON.stringify(Object.entries(t).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))

export const sameTarget = (a: ChallengeTarget, b: ChallengeTarget) => canon(a) === canon(b)

/** Premier groupe non vide après exclusion, un candidat tiré au hasard ; sinon le repli. */
function pick(groups: ChallengeTarget[][], exclude: ChallengeTarget[], rng: () => number, fallback: ChallengeTarget) {
  for (const group of groups) {
    const left = group.filter((t) => !exclude.some((x) => sameTarget(x, t)))
    if (left.length > 0) return left[Math.min(left.length - 1, Math.floor(rng() * left.length))]
  }
  return fallback
}

const isRecent = (day: Day, today: Day) => day >= addDays(today, -(RECENT_DAYS - 1)) && day <= today

/** Écart de difficulté d'un défi « exo » par rapport au plus dur déjà travaillé dans la catégorie. */
export const DIFFICULTY_JUMP = 2
/** Défi de tempo : +15 % (au moins +6 bpm), jusqu'à 10 % au-dessus du tempo cible de l'exo. */
const TEMPO_FACTOR = 1.15
const TEMPO_MIN_GAIN = 6
const TEMPO_CAP = 1.1

const suffix = (id: string) => Number(id.slice(id.lastIndexOf('-') + 1))

/** Premier exo (ordre du parcours) d'une catégorie à une difficulté donnée. */
function exerciseAt(category: string, difficulty: number) {
  return EXERCISES.filter((e) => e.category === category && e.difficulty === difficulty).sort((x, y) => suffix(x.id) - suffix(y.id))[0]
}

/**
 * Défis guitare, volontairement plus durs que les exos du jour (qui avancent d'un niveau à la fois) :
 * 1. un exo de la catégorie travaillée, 2 niveaux au-dessus du plus dur déjà fait, à son tempo cible ;
 * 2. un exo récent poussé de +15 % (au moins +6 bpm), au-delà du tempo cible si besoin ;
 * 3. maîtriser un morceau en cours ;
 * 4. sans exo récent : une catégorie déjà travaillée, 2 niveaux au-dessus du plus dur déjà fait ;
 * repli : gammes niveau 3 à leur tempo cible.
 */
export function generateGuitarTarget(data: AppData, today: Day, rng: () => number, exclude: ChallengeTarget[]): ChallengeTarget {
  const recentIds: string[] = []
  const sessions = [...data.guitarSessions].sort((a, b) => b.day.localeCompare(a.day))
  for (const s of sessions) {
    if (!isRecent(s.day, today)) continue
    for (const it of s.items) if (it.kind === 'exercise' && getExercise(it.exerciseId) && !recentIds.includes(it.exerciseId)) recentIds.push(it.exerciseId)
  }
  const maxDone = maxDifficultyByCategory(data.guitarSessions)

  const harderIn = (categories: Iterable<ExerciseCategory>): ChallengeTarget[] => {
    const out: ChallengeTarget[] = []
    for (const category of categories) {
      const e = exerciseAt(category, Math.min(10, (maxDone[category] ?? 0) + DIFFICULTY_JUMP))
      if (!e) continue
      const best = bestBpm(data.guitarSessions, e.id)
      if (best === null || best < e.targetBpm) out.push({ kind: 'bpm', exerciseId: e.id, bpm: e.targetBpm, baseline: best })
    }
    return out
  }
  const rule1 = harderIn(new Set(recentIds.map((id) => getExercise(id)!.category)))

  const rule2: ChallengeTarget[] = []
  for (const id of recentIds) {
    const e = getExercise(id)!
    const best = bestBpm(data.guitarSessions, id)
    if (best === null) continue
    const bpm = Math.min(Math.max(best + TEMPO_MIN_GAIN, roundEven(best * TEMPO_FACTOR)), roundEven(e.targetBpm * TEMPO_CAP))
    if (bpm > best) rule2.push({ kind: 'bpm', exerciseId: id, bpm, baseline: best })
  }
  const rule3: ChallengeTarget[] = data.songs.filter((s) => s.status === 'learning').map((s) => ({ kind: 'song', songId: s.id }))

  const start = exerciseAt('scales', 1 + DIFFICULTY_JUMP)
  const fallback: ChallengeTarget = { kind: 'bpm', exerciseId: start.id, bpm: start.targetBpm, baseline: null }
  const rule4 = harderIn(Object.keys(maxDone) as ExerciseCategory[])
  return pick([rule1, rule2, rule3, rule4], exclude, rng, fallback)
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
    if (bestWeight > 0) candidates.push({ kind: 'weight', programExerciseId: id, reps: repsAtBest, weightKg: bestWeight + WEIGHT_STEP, baseline: bestWeight })
    candidates.push({ kind: 'reps', programExerciseId: id, weightKg: bestWeight, reps: repsAtBest + REPS_STEP, baseline: repsAtBest })
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
        (s) => s.day >= ch.createdOn && s.sets.some((x) => x.programExerciseId === t.programExerciseId && x.weightKg >= t.weightKg && x.reps >= t.reps),
      )
    case 'sessionsInWeek': {
      const perWeek = new Map<Day, number>()
      for (const s of data.sportSessions) if (s.day >= ch.createdOn) perWeek.set(weekStart(s.day), (perWeek.get(weekStart(s.day)) ?? 0) + 1)
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
      // La moitié de l'écart, arrondie au disque de 1,25 kg.
      return { ...t, weightKg: t.baseline + Math.max(1.25, Math.round((t.weightKg - t.baseline) / 2 / 1.25) * 1.25) }
    case 'reps':
      return { ...t, reps: t.baseline + Math.max(1, Math.ceil((t.reps - t.baseline) / 2)) }
    default:
      return null
  }
}

export function canOfferEasier(ch: Challenge, today: Day): boolean {
  return ch.status === 'active' && !ch.easier && ch.blockedSince !== null && daysBetween(ch.blockedSince, today) >= EASIER_AFTER_DAYS && isEasier(ch.target)
}

/** Vrai seulement si la version facile change vraiment la cible. */
function isEasier(t: ChallengeTarget): boolean {
  const e = easierTarget(t)
  return e !== null && !sameTarget(e, t)
}

export function canReroll(ch: Challenge): boolean {
  return ch.status === 'active' && ch.rerolls < MAX_REROLLS
}

export function formatKg(kg: number): string {
  return String(kg).replace('.', ',')
}

export function describeTarget(t: ChallengeTarget, data: AppData): string {
  const exoName = (id: string) => data.programs.flatMap((p) => p.exercises).find((e) => e.id === id)?.name ?? 'Exo inconnu'
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
