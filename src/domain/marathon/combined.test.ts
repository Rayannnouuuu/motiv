import { describe, expect, test } from 'vitest'
import { addDays } from '../date'
import { combineMuscu, type MuscuInput } from './combined'
import { profile, TODAY } from './fixtures'
import { generatePlan, type PlanWeek } from './plan'
import { RUNNER_TEMPLATE_ID } from './strength'

const p = profile()
const base = generatePlan(p, 78, [], TODAY)
const PPL = [
  { id: 'push', name: 'Push', lower: false },
  { id: 'pull', name: 'Pull', lower: false },
  { id: 'legs', name: 'Legs', lower: true },
]
const input = (over: Partial<MuscuInput> = {}): MuscuInput => ({
  rotation: PPL,
  next: 0,
  doneThisWeek: 0,
  doneToday: false,
  runner: { id: RUNNER_TEMPLATE_ID, name: 'Renfo coureur', lower: true },
  raceDay: p.race.day,
  today: TODAY,
  ...over,
})
const plan = combineMuscu(base, input())
const runOn = (w: PlanWeek, d: string) => w.runs.filter((r) => r.day === d && r.kind !== 'cross')

describe('combineMuscu', () => {
  test('sans rotation : le renfo coureur du plan reste', () => {
    expect(combineMuscu(base, input({ rotation: [] }))).toBe(base)
  })

  test('base : Push, Pull, Legs dans l’ordre de la rotation, jamais le jour de la sortie longue', () => {
    const w = plan.weeks[0]
    expect(w.strength.map((s) => s.name)).toEqual(['Push', 'Pull', 'Legs'])
    for (const s of w.strength) expect(runOn(w, s.day).some((r) => r.kind === 'long')).toBe(false)
  })

  test('toutes les semaines : jambes jamais la veille d’une sortie longue, d’une séance dure ou de la course, ni le lendemain de la sortie longue', () => {
    const key = new Set(['long', 'threshold', 'intervals', 'racePace', 'race'])
    const all = plan.weeks.flatMap((w) => w.runs)
    for (const w of plan.weeks)
      for (const s of w.strength.filter((x) => x.programId === 'legs' || x.programId === RUNNER_TEMPLATE_ID)) {
        expect(all.some((r) => r.day === addDays(s.day, 1) && key.has(r.kind))).toBe(false)
        expect(all.some((r) => r.day === addDays(s.day, -1) && r.kind === 'long')).toBe(false)
      }
  })

  test('une séance par jour au plus, la rotation continue d’une semaine à l’autre', () => {
    const order = plan.weeks.flatMap((w) => w.strength)
    for (const w of plan.weeks) expect(new Set(w.strength.map((s) => s.day)).size).toBe(w.strength.length)
    // Hors renfo coureur (qui remplace les jambes), la suite suit Push → Pull → Legs.
    const names = order.map((s) => (s.programId === RUNNER_TEMPLATE_ID ? 'Legs' : s.name))
    names.forEach((n, i) => i > 0 && expect(PPL[(PPL.findIndex((x) => x.name === names[i - 1]) + 1) % 3].name).toBe(n))
  })

  test('dosage : 3 en base, 2 en spécifique (jambes → renfo coureur), 1 légère au début de l’affûtage, rien les 10 derniers jours', () => {
    const byPhase = (ph: PlanWeek['phase']) => plan.weeks.filter((w) => w.phase === ph && !w.deload && !w.sick)
    expect(byPhase('base').every((w) => w.strength.length === 3)).toBe(true)
    expect(byPhase('specific').every((w) => w.strength.length === 2)).toBe(true)
    expect(
      byPhase('specific')
        .flatMap((w) => w.strength)
        .some((s) => s.programId === 'legs'),
    ).toBe(false)
    const taper = plan.weeks.filter((w) => w.phase === 'taper')
    expect(taper[0].strength).toHaveLength(1)
    expect(taper[0].strength[0].light).toBe(true)
    const lastAllowed = addDays(p.race.day, -11)
    expect(plan.weeks.flatMap((w) => w.strength).every((s) => s.day <= lastAllowed)).toBe(true)
  })

  test('semaine en cours : séances déjà faites décomptées, rien avant aujourd’hui ni aujourd’hui si une séance est faite', () => {
    const today = addDays(TODAY, 2) // mercredi
    const wk = combineMuscu(base, input({ today, doneThisWeek: 1, doneToday: true, next: 1 })).weeks[0]
    expect(wk.strength.length).toBe(2)
    expect(wk.strength[0].name).toBe('Pull')
    expect(wk.strength.every((s) => s.day > today)).toBe(true)
  })
})
