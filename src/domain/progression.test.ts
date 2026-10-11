import { describe, expect, test } from 'vitest'
import { challenge, data, ex, g, program, ss } from '../test/factories'
import {
  acceptEasier,
  applyChallengeUpdates,
  nextProgram,
  planChallengeUpdates,
  rerollChallenge,
  settleChallenges,
  type ChallengeUpdate,
} from './progression'
import type { Challenge } from './types'

const today = '2026-10-15'
let n = 0
const deps = { rng: () => 0, newId: () => `new-${++n}` }
const creates = (u: ChallengeUpdate[]) => u.flatMap((x) => (x.type === 'create' ? [x.challenge] : []))

describe('planChallengeUpdates', () => {
  test('compte neuf : crée le défi niveau 1 pour guitare et sport', () => {
    const c = creates(planChallengeUpdates(data(), today, deps))
    expect(c.map((x) => x.domain).sort()).toEqual(['guitar', 'sport'])
    expect(c.every((x) => x.level === 1 && x.status === 'active' && x.createdOn === today && x.rerolls === 0)).toBe(true)
  })

  test('défi atteint → markDone ; puis niveau suivant → nouveau défi niveau 2', () => {
    const c1 = challenge({ id: 'c1', createdOn: '2026-10-01', target: { kind: 'bpm', exerciseId: 'legato-10', bpm: 110, baseline: 100 } })
    const sport = challenge({ id: 'cs', domain: 'sport', target: { kind: 'sessionsInWeek', count: 3 } })
    const d = data({ challenges: [c1, sport], guitarSessions: [g(today, 60, [ex('legato-10', 110)], 1300)] })
    const all = settleChallenges(d, today, deps)
    expect(all).toContainEqual({ type: 'markDone', id: 'c1', doneOn: today })
    const lvl2 = creates(all).find((x) => x.domain === 'guitar')!
    expect(lvl2.level).toBe(2)
    expect(lvl2.blockedSince).toBeNull()
  })

  test('bloqué sans blockedSince → setBlockedSince(today), une seule fois', () => {
    const c1 = challenge({ id: 'c1', target: { kind: 'song', songId: 's1' } })
    const sport = challenge({ id: 'cs', domain: 'sport', target: { kind: 'sessionsInWeek', count: 3 } })
    const d = data({ challenges: [c1, sport], guitarSessions: [g(today, 60, [], 1250)] })
    expect(planChallengeUpdates(d, today, deps)).toEqual([{ type: 'setBlockedSince', id: 'c1', day: today }])
    const after = { ...d, challenges: applyChallengeUpdates(d.challenges, [{ type: 'setBlockedSince', id: 'c1', day: today }]) }
    expect(planChallengeUpdates(after, today, deps)).toEqual([])
  })

  test('un seul défi actif par domaine et niveau', () => {
    const d = data({ challenges: [challenge({ target: { kind: 'song', songId: 's1' } }), challenge({ domain: 'sport', target: { kind: 'sessionsInWeek', count: 3 } })] })
    expect(planChallengeUpdates(d, today, deps)).toEqual([])
  })

  test('défi réussi en avance sans assez d’XP : pas de nouveau défi', () => {
    const d = data({
      challenges: [challenge({ status: 'done', doneOn: today }), challenge({ domain: 'sport', target: { kind: 'sessionsInWeek', count: 3 } })],
      guitarSessions: [g(today, 60)],
    })
    expect(planChallengeUpdates(d, today, deps)).toEqual([])
  })
})

describe('relance et version plus facile', () => {
  const twoExos = data({ guitarSessions: [g('2026-10-14', 30, [ex('legato-10', 100), ex('picking-10', 100)])] })

  test('rerollChallenge : replace + nouveau défi même niveau, rerolls + 1, cible différente', () => {
    const c: Challenge = challenge({ id: 'c1', createdOn: '2026-10-10', blockedSince: '2026-10-12', target: { kind: 'bpm', exerciseId: 'legato-10', bpm: 110, baseline: 100 } })
    const u = rerollChallenge({ ...twoExos, challenges: [c] }, 'c1', today, deps)
    expect(u[0]).toEqual({ type: 'replace', id: 'c1' })
    const next = creates(u)[0]
    expect(next).toMatchObject({ level: 1, domain: 'guitar', rerolls: 1, status: 'active', createdOn: '2026-10-10', blockedSince: '2026-10-12' })
    expect(next.target).toMatchObject({ exerciseId: 'picking-10' })
  })

  test('rerollChallenge refusé à 2 relances', () => {
    const c = challenge({ id: 'c1', rerolls: 2 })
    expect(rerollChallenge({ ...twoExos, challenges: [c] }, 'c1', today, deps)).toEqual([])
  })

  test('rerollChallenge sans autre cible possible : refusé', () => {
    const c = challenge({ id: 'c1' }) // scales-1, compte vide → seule cible possible
    expect(rerollChallenge(data({ challenges: [c] }), 'c1', today, deps)).toEqual([])
  })

  test('acceptEasier : replace + défi easier=true même niveau', () => {
    const c = challenge({ id: 'c1', blockedSince: '2026-10-01', target: { kind: 'bpm', exerciseId: 'legato-10', bpm: 110, baseline: 100 } })
    const u = acceptEasier(data({ challenges: [c] }), 'c1', today, deps)
    expect(u[0]).toEqual({ type: 'replace', id: 'c1' })
    expect(creates(u)[0]).toMatchObject({ easier: true, level: 1, target: { bpm: 106 } })
  })

  test('acceptEasier refusé si canOfferEasier faux', () => {
    const c = challenge({ id: 'c1', blockedSince: '2026-10-10' })
    expect(acceptEasier(data({ challenges: [c] }), 'c1', today, deps)).toEqual([])
  })
})

describe('nextProgram', () => {
  const a = program({ id: 'a', position: 0, name: 'Haut' })
  const b = program({ id: 'b', position: 1, name: 'Bas' })
  const c = program({ id: 'c', position: 2, name: 'Full', archived: true })

  test('première séance : le premier programme', () => {
    expect(nextProgram([b, a], [])?.id).toBe('a')
  })

  test('suit la position après la dernière séance, boucle, ignore les archivés', () => {
    expect(nextProgram([a, b, c], [ss([], '2026-10-10', 'a')])?.id).toBe('b')
    expect(nextProgram([a, b, c], [ss([], '2026-10-10', 'a'), ss([], '2026-10-12', 'b')])?.id).toBe('a')
  })

  test('aucun programme actif', () => {
    expect(nextProgram([c], [])).toBeUndefined()
  })
})
