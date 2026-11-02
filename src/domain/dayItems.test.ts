import { describe, expect, test } from 'vitest'
import { addDays } from './date'
import { addSession, EMPTY_EDITS, isHidden, itemsOn, missedBefore, moveItem, planKey, prune, removeItem, type PlannedItem } from './dayItems'
import { profile, TODAY } from './marathon/fixtures'
import { generatePlan } from './marathon/plan'
import type { Session } from './model'

const plan = generatePlan(profile(), 78, [], TODAY)
const week = plan.weeks[plan.current]
const planned = week.runs.find((r) => r.kind !== 'cross')!
const ctx = (edits = EMPTY_EDITS, sessions: Session[] = []) => ({ plan, edits, sessions })
const session = (over: Partial<Session>): Session => ({
  id: 's1',
  discipline: 'sport',
  day: TODAY,
  createdAt: `${TODAY}T18:00:00Z`,
  durationMin: 50,
  isLight: false,
  flowScore: 3,
  desireScore: 3,
  blocks: [],
  xp: 0,
  ...over,
})
const lift: PlannedItem = { kind: 'strength', programId: 'pull' }
const longRun: PlannedItem = { kind: 'run', runKind: 'long', km: 15 }

describe('séances d’un jour', () => {
  test('le plan, moins ce qui est retiré, plus ce qui est ajouté', () => {
    const items = itemsOn(planned.day, ctx())
    expect(items.some((i) => i.key === `run-${planned.kind}` && !i.addedId && !i.done)).toBe(true)
    const hidden = removeItem(
      EMPTY_EDITS,
      items.find((i) => i.key === `run-${planned.kind}`)!,
    )
    expect(isHidden(hidden, planned.day, `run-${planned.kind}`)).toBe(true)
    expect(itemsOn(planned.day, ctx(hidden)).some((i) => i.key === `run-${planned.kind}`)).toBe(false)
    const added = addSession(hidden, planned.day, lift, 'a1')
    expect(itemsOn(planned.day, ctx(added)).filter((i) => i.addedId === 'a1')).toEqual([expect.objectContaining({ key: 'added-a1', item: lift, done: false })])
  })

  test('sans plan, seules les séances ajoutées existent', () => {
    const edits = addSession(EMPTY_EDITS, TODAY, longRun, 'a1')
    expect(itemsOn(TODAY, { plan: null, edits, sessions: [] })).toEqual([{ day: TODAY, key: 'added-a1', item: longRun, addedId: 'a1', done: false }])
    expect(itemsOn(addDays(TODAY, 1), { plan: null, edits, sessions: [] })).toEqual([])
  })

  test('une séance ajoutée est faite quand une séance du même genre est notée ce jour-là', () => {
    const edits = addSession(addSession(EMPTY_EDITS, TODAY, lift, 'a1'), TODAY, { kind: 'guitar' }, 'a2')
    const done = (sessions: Session[]) => itemsOn(TODAY, { plan: null, edits, sessions }).map((i) => i.done)
    expect(done([])).toEqual([false, false])
    expect(done([session({ templateId: 'pull' })])).toEqual([true, false])
    expect(done([session({ discipline: 'guitar' })])).toEqual([false, true])
  })

  test('clés stables', () => {
    expect(planKey(lift)).toBe('muscu-pull')
    expect(planKey(longRun)).toBe('run-long')
    expect(planKey({ kind: 'guitar' })).toBe('guitar')
  })
})

describe('déplacer et retirer', () => {
  test('déplacer une séance du plan : masquée ici, ajoutée là', () => {
    const it = itemsOn(planned.day, ctx()).find((i) => i.key === `run-${planned.kind}`)!
    const to = addDays(planned.day, 2)
    const moved = moveItem(EMPTY_EDITS, it, to, 'm1')
    expect(itemsOn(planned.day, ctx(moved)).some((i) => i.key === `run-${planned.kind}`)).toBe(false)
    expect(itemsOn(to, ctx(moved)).find((i) => i.addedId === 'm1')?.item).toEqual(it.item)
  })

  test('déplacer une séance ajoutée : la même, un autre jour ; son propre jour : rien', () => {
    const e = addSession(EMPTY_EDITS, TODAY, lift, 'a1')
    const it = itemsOn(TODAY, { plan: null, edits: e, sessions: [] })[0]
    expect(moveItem(e, it, TODAY, 'x')).toBe(e)
    const moved = moveItem(e, it, addDays(TODAY, 3), 'x')
    expect(moved.added).toEqual([{ id: 'a1', day: addDays(TODAY, 3), item: lift }])
  })

  test('retirer une séance ajoutée la supprime', () => {
    const e = addSession(EMPTY_EDITS, TODAY, lift, 'a1')
    expect(removeItem(e, itemsOn(TODAY, { plan: null, edits: e, sessions: [] })[0])).toEqual(EMPTY_EDITS)
  })
})

describe('rattraper', () => {
  test('les séances prévues les 3 derniers jours et pas faites, sans vélo ni course', () => {
    const edits = addSession(EMPTY_EDITS, addDays(TODAY, -1), longRun, 'a1')
    const m = missedBefore(TODAY, { plan: null, edits, sessions: [] })
    expect(m.map((i) => i.key)).toEqual(['added-a1'])
    expect(m[0].day).toBe(addDays(TODAY, -1))
  })

  test('faite le jour même ou plus de 3 jours en arrière : plus à rattraper', () => {
    const edits = addSession(addSession(EMPTY_EDITS, addDays(TODAY, -1), { kind: 'guitar' }, 'g'), addDays(TODAY, -5), lift, 'old')
    const played = session({ discipline: 'guitar', day: addDays(TODAY, -1) })
    expect(missedBefore(TODAY, { plan: null, edits, sessions: [played] })).toEqual([])
  })
})

describe('on ne garde que deux semaines de passé', () => {
  test('les ajouts et masquages plus vieux que 14 jours disparaissent', () => {
    let e = addSession(EMPTY_EDITS, addDays(TODAY, -20), lift, 'old')
    e = addSession(e, addDays(TODAY, -2), lift, 'recent')
    e = { ...e, hidden: [`${addDays(TODAY, -30)}|run-easy`, `${addDays(TODAY, -1)}|run-long`] }
    const p = prune(e, TODAY)
    expect(p.added.map((a) => a.id)).toEqual(['recent'])
    expect(p.hidden).toEqual([`${addDays(TODAY, -1)}|run-long`])
  })
})
