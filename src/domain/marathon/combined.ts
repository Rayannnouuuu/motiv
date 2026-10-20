/**
 * Plan sport complet : le plan marathon et ta muscu (rotation Push / Pull / Legs) dans la même semaine.
 * Le plan marathon garde ses sorties ; ses créneaux de renfo deviennent tes séances de muscu, placées et dosées
 * pour ne pas gêner la course. Rien n'est stocké : recalculé avec le plan.
 *
 * Règles (entraînement concurrent course + force) :
 * - Combien : 3 séances en base et développement (2 en semaine allégée), 2 en spécifique, 1 légère au début de
 *   l'affûtage, aucune les 10 derniers jours ni en semaine malade.
 * - Jamais le jour de la sortie longue ni de la course.
 * - Jambes : jamais la veille d'une sortie longue, d'une séance de qualité ou de la course, ni le lendemain de la
 *   sortie longue. De préférence le jour d'une séance dure (après elle) : les jours faciles restent faciles.
 * - Haut du corps : de préférence un jour sans course, sinon un jour de footing.
 * - En spécifique et en affûtage, la séance jambes devient le renfo coureur (plus léger, utile à la course).
 * - L'ordre de ta rotation est respecté et les séances sont étalées sur la semaine.
 */
import { findMovement } from '../../content/sportLibrary'
import { addDays, daysBetween } from '../date'
import type { Day, Program } from '../types'
import { RULES, type Plan, type PlanWeek, type PlannedStrength } from './plan'

export interface MuscuProgram {
  id: string
  name: string
  /** Séance surtout jambes (au moins la moitié des exos en bas du corps). */
  lower: boolean
}

export interface MuscuInput {
  /** Ta rotation, dans l'ordre. Vide : le renfo coureur du plan reste tel quel. */
  rotation: MuscuProgram[]
  /** Place, dans la rotation, de la prochaine séance à faire. */
  next: number
  /** Séances de muscu déjà faites cette semaine (rotation ou renfo coureur). */
  doneThisWeek: number
  /** Une séance de muscu déjà faite aujourd'hui : pas de deuxième créneau aujourd'hui. */
  doneToday: boolean
  /** Le renfo coureur, qui remplace les jambes en spécifique et en affûtage. */
  runner: MuscuProgram | null
  raceDay: Day
  today: Day
  /** Jours indisponibles : pas de muscu ces jours-là. */
  offDays?: Day[]
}

/** Une séance de ta rotation telle que le plan la place : jambes si au moins la moitié des exos sont en bas du corps. */
export function toMuscu(p: Program): MuscuProgram {
  const exos = p.exercises.filter((e) => !e.archived)
  const lower = exos.filter((e) => findMovement(e.name)?.body === 'lower').length
  return { id: p.id, name: p.name, lower: exos.length > 0 && lower * 2 >= exos.length }
}

const HARD = new Set(['threshold', 'intervals', 'racePace'])

/** Nombre de séances de muscu voulues dans la semaine. */
function wanted(w: PlanWeek, rotationSize: number): number {
  if (w.sick) return 0
  if (w.phase === 'taper') return w.strength.length > 0 ? 1 : 0
  const n = w.phase === 'specific' ? 2 : 3
  return Math.min(rotationSize, w.deload ? n - 1 : n)
}

/** Les jours d'une semaine où chaque séance peut aller, et leur préférence (0 = le mieux). */
function dayRules(w: PlanWeek, raceDay: Day) {
  const runOn = (d: Day) => w.runs.filter((r) => r.day === d && r.kind !== 'cross')
  const isLong = (d: Day) => runOn(d).some((r) => r.kind === 'long')
  const isRace = (d: Day) => runOn(d).some((r) => r.kind === 'race') || d === raceDay
  const isHard = (d: Day) => runOn(d).some((r) => HARD.has(r.kind))
  const keyRun = (d: Day) => isLong(d) || isRace(d) || isHard(d)
  return {
    allowed(d: Day, lower: boolean) {
      if (isLong(d) || isRace(d)) return false
      if (!lower) return true
      return !keyRun(addDays(d, 1)) && !isLong(addDays(d, -1))
    },
    tier(d: Day, lower: boolean) {
      const rest = runOn(d).length === 0
      if (lower) return isHard(d) ? 0 : rest ? 2 : 1
      return rest ? 0 : isHard(d) ? 2 : 1
    },
  }
}

/**
 * Place les séances de la semaine dans l'ordre de la rotation, en respectant les règles : on garde la combinaison
 * de jours qui en place le plus, puis la mieux répartie (au plus 3 séances sur 7 jours : on essaie tout).
 */
function placeWeek(w: PlanWeek, programs: MuscuProgram[], from: Day, raceDay: Day, light: boolean, off: Set<Day>): PlannedStrength[] {
  const last = addDays(raceDay, -(RULES.noStrengthDays + 1))
  const days = Array.from({ length: 7 }, (_, i) => addDays(w.start, i)).filter((d) => d >= from && d <= last && !off.has(d))
  const rules = dayRules(w, raceDay)
  let best: { days: Day[]; score: number } = { days: [], score: 0 }
  const search = (k: number, chosen: Day[], score: number) => {
    if (chosen.length > best.days.length || (chosen.length === best.days.length && score < best.score)) best = { days: chosen, score }
    if (k === programs.length) return
    const p = programs[k]
    for (const d of days) {
      if (chosen.length > 0 && d <= chosen[chosen.length - 1]) continue
      if (!rules.allowed(d, p.lower)) continue
      // Préférence du jour, et jamais deux séances de muscu collées si on peut l'éviter.
      const glued = chosen.length > 0 && daysBetween(chosen[chosen.length - 1], d) === 1 ? 1 : 0
      search(k + 1, [...chosen, d], score + rules.tier(d, p.lower) * 2 + glued)
    }
  }
  search(0, [], 0)
  return best.days.map((day, i) => ({ day, light, programId: programs[i].id, name: programs[i].name }))
}

/** Le plan avec ta muscu à la place du renfo coureur, de la semaine en cours jusqu'à la course. */
export function combineMuscu(plan: Plan, input: MuscuInput): Plan {
  const { rotation, runner, raceDay, today } = input
  if (rotation.length === 0) return plan
  let pointer = input.next
  const off = new Set(input.offDays ?? [])
  const weeks = plan.weeks.map((w, i) => {
    if (i < plan.current) return { ...w, strength: [] }
    const current = i === plan.current
    let n = wanted(w, rotation.length)
    if (current) n = Math.max(0, n - input.doneThisWeek)
    const late = w.phase === 'specific' || w.phase === 'taper'
    const programs = Array.from({ length: n }, (_, k) => {
      const p = rotation[(pointer + k) % rotation.length]
      return late && p.lower && runner ? runner : p
    })
    const from = current ? (input.doneToday ? addDays(today, 1) : today) : w.start
    const strength = placeWeek(w, programs, from, raceDay, w.phase === 'taper' || w.deload, off)
    // La rotation avance du nombre de séances placées (la suivante reprend où on s'est arrêté).
    pointer += strength.length
    return { ...w, strength }
  })
  return { ...plan, weeks }
}
