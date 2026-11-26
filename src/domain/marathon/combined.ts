/**
 * Plan sport complet : le plan marathon et ta muscu (rotation Push / Pull / Legs) dans la même semaine.
 * Le plan marathon garde ses sorties ; ses créneaux de renfo deviennent tes séances de muscu, placées et dosées
 * pour ne pas gêner la course. Rien n'est stocké : recalculé avec le plan.
 *
 * Règles (entraînement concurrent course + force) :
 * - Combien : 3 séances en base et développement (2 en semaine allégée), 2 en spécifique, 1 légère au début de
 *   l'affûtage, aucune les 10 derniers jours ni en semaine malade.
 * - Jamais un jour de course (lot 31 : course + muscu le même jour, « ça fait beaucoup »).
 * - Jambes : jamais la veille d'une sortie longue, d'une séance de qualité ou de la course, ni le lendemain de la
 *   sortie longue.
 * - En spécifique et en affûtage, la séance jambes devient le renfo coureur (plus léger, utile à la course).
 * - L'ordre de ta rotation est respecté et les séances sont étalées sur la semaine.
 */
import { findMovement } from '../../content/sportLibrary'
import { addDays, daysBetween } from '../date'
import type { Day, Program } from '../types'
import { HARD_KINDS, RULES, type Plan, type PlanWeek, type PlannedStrength } from './plan'

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
  const isHard = (d: Day) => runOn(d).some((r) => HARD_KINDS.has(r.kind))
  const keyRun = (d: Day) => isLong(d) || isRace(d) || isHard(d)
  return {
    allowed(d: Day, lower: boolean) {
      if (runOn(d).length > 0 || isRace(d)) return false
      if (!lower) return true
      return !keyRun(addDays(d, 1)) && !isLong(addDays(d, -1))
    },
    /** Jambes : de préférence le lendemain d'une séance dure (les deux fatigues sur les mêmes 48 h, le reste de la semaine frais). */
    tier(d: Day, lower: boolean) {
      return lower && !isHard(addDays(d, -1)) ? 1 : 0
    },
  }
}

/**
 * Place les séances de la semaine sur les jours libres, en respectant les règles : les prochaines séances de la rotation
 * (le plus possible, dans l'ordre de la rotation), chacune sur le jour qui lui va, même si l'ordre des jours change
 * (jambes le seul jour possible, le haut du corps sur les autres). À égalité : l'ordre de la rotation, les jours
 * préférés, pas deux séances collées (au plus 3 séances sur 7 jours : on essaie tout).
 */
function placeWeek(w: PlanWeek, programs: MuscuProgram[], from: Day, raceDay: Day, light: boolean, off: Set<Day>): PlannedStrength[] {
  const last = addDays(raceDay, -(RULES.noStrengthDays + 1))
  const days = Array.from({ length: 7 }, (_, i) => addDays(w.start, i)).filter((d) => d >= from && d <= last && !off.has(d))
  const rules = dayRules(w, raceDay)
  let best: { picks: [number, Day][]; score: number } = { picks: [], score: 0 }
  const score = (picks: [number, Day][]) => {
    const sorted = [...picks].sort((a, b) => (a[1] < b[1] ? -1 : 1))
    return sorted.reduce((s, [k, d], i) => {
      const prev = sorted[i - 1]
      const glued = prev && daysBetween(prev[1], d) === 1 ? 1 : 0
      const swapped = prev && prev[0] > k ? 1 : 0
      return s + rules.tier(d, programs[k].lower) * 2 + glued + swapped
    }, 0)
  }
  const search = (k: number, picks: [number, Day][]) => {
    const s = score(picks)
    if (picks.length > best.picks.length || (picks.length === best.picks.length && s < best.score)) best = { picks, score: s }
    if (k === programs.length) return
    for (const d of days) {
      if (picks.some(([, x]) => x === d) || !rules.allowed(d, programs[k].lower)) continue
      search(k + 1, [...picks, [k, d]])
    }
  }
  search(0, [])
  return [...best.picks].sort((a, b) => (a[1] < b[1] ? -1 : 1)).map(([k, day]) => ({ day, light, programId: programs[k].id, name: programs[k].name }))
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
