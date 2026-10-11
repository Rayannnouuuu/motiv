import { EXERCISES, getExercise, nextInCategory, type Exercise, type ExerciseCategory } from '../content/exercises'
import { maxDifficultyByCategory } from './records'
import type { AppData, Day } from './types'

export const DAILY_PLAN_SIZE = 3

const CATEGORIES = [...new Set(EXERCISES.map((e) => e.category))]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const suffix = (id: string) => Number(id.slice(id.lastIndexOf('-') + 1))
const ordered = (category: ExerciseCategory) =>
  EXERCISES.filter((e) => e.category === category).sort((a, b) => a.difficulty - b.difficulty || suffix(a.id) - suffix(b.id))

/** Prochain exo d'une catégorie : le plus facile au-dessus du max déjà travaillé, sinon le plus dur. */
function nextFor(category: ExerciseCategory, maxDone: number | undefined): Exercise {
  const list = ordered(category)
  if (maxDone === undefined) return list[0]
  return list.find((e) => e.difficulty > maxDone) ?? list.at(-1)!
}

/**
 * Exos proposés aujourd'hui, dans l'ordre :
 * 1. l'exo du défi guitare en cours (défi de tempo) ;
 * 2. la suite de la dernière catégorie travaillée (gammes pour un compte neuf) ;
 * 3. une autre catégorie, qui change chaque jour.
 * Le plan est stable sur la journée.
 */
export function dailyPlan(data: Pick<AppData, 'guitarSessions' | 'challenges'>, today: Day): Exercise[] {
  const plan: Exercise[] = []
  const add = (ex: Exercise | undefined) => {
    // Doublon : on avance dans la catégorie plutôt que de perdre une place.
    while (ex && plan.some((p) => p.id === ex!.id)) ex = nextInCategory(ex)
    if (ex && plan.length < DAILY_PLAN_SIZE) plan.push(ex)
  }

  const challenge = data.challenges.find((c) => c.domain === 'guitar' && c.status === 'active' && c.target.kind === 'bpm')
  if (challenge?.target.kind === 'bpm') add(getExercise(challenge.target.exerciseId))

  // Historique jusqu'à hier : le plan ne bouge pas quand on logge un exo du jour.
  const past = data.guitarSessions.filter((s) => s.day < today)
  const maxDone = maxDifficultyByCategory(past)
  let lastCategory: ExerciseCategory = 'scales'
  const recent = [...past].sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt))
  outer: for (const s of recent)
    for (const it of s.items) {
      const ex = it.kind === 'exercise' ? getExercise(it.exerciseId) : undefined
      if (ex) {
        lastCategory = ex.category
        break outer
      }
    }
  add(nextFor(lastCategory, maxDone[lastCategory]))

  const used = new Set(plan.map((p) => p.category))
  const others = CATEGORIES.filter((c) => !used.has(c))
  for (let i = 0; plan.length < DAILY_PLAN_SIZE && i < others.length; i++) {
    const c = others[(hash(today) + i) % others.length]
    add(nextFor(c, maxDone[c]))
  }
  return plan
}
