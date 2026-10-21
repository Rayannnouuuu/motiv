import { describe, expect, test } from 'vitest'
import { challenge, data, ex, g, mkSong } from '../test/factories'
import { cycleState, cyclesReached, planLongRun, proposeTargets, recordsBetween, type Cycle } from './cycles'
import { profile, TODAY } from './marathon/fixtures'
import { generatePlan } from './marathon/plan'

const cycle = (over: Partial<Cycle> = {}): Cycle => ({ start: '2026-10-19', guitar: 'cg', sport: 'cs', ...over })

describe('cycleState', () => {
  test('rien, en cours (semaine 1 à 6), puis bilan à faire, puis plus rien une fois le bilan fait', () => {
    expect(cycleState([], '2026-10-20')).toEqual({ kind: 'none' })
    expect(cycleState([cycle()], '2026-10-20')).toMatchObject({ kind: 'running', week: 1, number: 1 })
    expect(cycleState([cycle()], '2026-11-29')).toMatchObject({ kind: 'running', week: 6 })
    expect(cycleState([cycle()], '2026-11-30')).toMatchObject({ kind: 'review', number: 1 })
    expect(cycleState([cycle({ review: { at: '2026-11-30', keep: 'ok' } })], '2026-11-30')).toEqual({ kind: 'none' })
  })
})

describe('proposeTargets', () => {
  test('un objectif encore ouvert est repris ; sinon un objectif à la portée', () => {
    const open = challenge({ id: 'x', target: { kind: 'song', songId: 's1' } })
    const t = proposeTargets(data({ challenges: [open], songs: [mkSong({ id: 's1' })] }), '2026-10-20', () => 0)
    expect(t.guitar).toEqual({ kind: 'song', songId: 's1' })
    expect(t.sport.kind).toBe('sessionsInWeek')
  })

  test('pendant un plan marathon : la plus longue sortie prévue dans les 6 semaines', () => {
    const plan = generatePlan(profile(), 78, [], TODAY)
    const km = planLongRun(plan, '2026-10-19')!
    expect(km).toBeGreaterThan(0)
    expect(proposeTargets(data(), TODAY, () => 0, plan).sport).toEqual({ kind: 'longRun', km })
  })
})

test('objectifs atteints pendant leur cycle : comptés par discipline', () => {
  const done = challenge({ id: 'cg', status: 'done', doneOn: '2026-11-10' })
  const late = challenge({ id: 'cs', domain: 'sport', status: 'done', doneOn: '2026-12-10' })
  expect(cyclesReached([cycle()], [done, late])).toEqual({ guitar: 1, sport: 0 })
})

test('records battus pendant le cycle', () => {
  const d = data({ guitarSessions: [g('2026-10-10', 30, [ex('legato-4', 90)]), g('2026-10-25', 30, [ex('legato-4', 96)])] })
  expect(recordsBetween(d, '2026-10-19', '2026-11-29')).toEqual({ guitar: 1, sport: 0 })
})
