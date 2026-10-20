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

/**
 * Prochain exo d'une catégorie : le niveau juste au-dessus du max déjà travaillé (sinon le plus dur). À niveau
 * égal, la variante change selon le jour : « Gamme majeure 11 » sort aussi, pas seulement « Gamme majeure 1 ».
 */
function nextFor(category: ExerciseCategory, maxDone: number | undefined, today: Day): Exercise {
  const list = ordered(category)
  const first = maxDone === undefined ? list[0] : (list.find((e) => e.difficulty > maxDone) ?? list.at(-1)!)
  const variants = list.filter((e) => e.difficulty === first.difficulty)
  return variants[hash(`${today}:${category}`) % variants.length]
}

/**
 * Exos proposés aujourd'hui, dans l'ordre :
 * 1. la suite de la dernière catégorie travaillée (gammes pour un compte neuf) ;
 * 2-3. d'autres catégories, qui changent chaque jour.
 * L'exo du défi en cours n'en fait jamais partie.
 * Le plan est stable sur la journée.
 */
export function dailyPlan(data: Pick<AppData, 'guitarSessions' | 'challenges'>, today: Day): Exercise[] {
  const plan: Exercise[] = []
  // L'exo d'un défi en cours se travaille à part : il n'est jamais proposé dans les exos du jour.
  const challengeIds = new Set(
    data.challenges.flatMap((c) => (c.domain === 'guitar' && c.status === 'active' && c.target.kind === 'bpm' ? [c.target.exerciseId] : [])),
  )
  const add = (ex: Exercise | undefined) => {
    // Doublon ou exo de défi : on avance dans la catégorie plutôt que de perdre une place.
    while (ex && (plan.some((p) => p.id === ex!.id) || challengeIds.has(ex.id))) ex = nextInCategory(ex)
    if (ex && plan.length < DAILY_PLAN_SIZE) plan.push(ex)
  }

  // Historique jusqu'à hier : le plan ne bouge pas quand on logge un exo du jour.
  const past = data.guitarSessions.filter((s) => s.day < today)
  const maxDone = maxDifficultyByCategory(past)
  let lastCategory: ExerciseCategory = 'scales'
  const recent = [...past].sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt))
  outer: for (const s of recent)
    for (const it of [...s.items].reverse()) {
      const ex = it.kind === 'exercise' ? getExercise(it.exerciseId) : undefined
      if (ex) {
        lastCategory = ex.category
        break outer
      }
    }
  add(nextFor(lastCategory, maxDone[lastCategory], today))

  const used = new Set(plan.map((p) => p.category))
  const others = CATEGORIES.filter((c) => !used.has(c))
  for (let i = 0; plan.length < DAILY_PLAN_SIZE && i < others.length; i++) {
    const c = others[(hash(today) + i) % others.length]
    add(nextFor(c, maxDone[c], today))
  }
  return plan
}
