import { describe, expect, test } from 'vitest'
import { challenge, data, ex, g, program, ss } from '../test/factories'
import { acceptEasier, nextProgram, planChallengeUpdates, rerollChallenge, settleChallenges, type ChallengeUpdate } from './progression'
import type { Challenge, ChallengeTarget } from './types'

const today = '2026-10-15'
let n = 0
const deps = { rng: () => 0, newId: () => `new-${++n}` }
const creates = (u: ChallengeUpdate[]) => u.flatMap((x) => (x.type === 'create' ? [x.challenge] : []))

describe('planChallengeUpdates', () => {
  test('compte neuf : aucun défi créé tout seul (les objectifs naissent avec les cycles)', () => {
    expect(planChallengeUpdates(data(), today)).toEqual([])
  })

  test('objectif atteint → réussi ce jour-là, rien d’autre', () => {
    const c1 = challenge({ id: 'c1', createdOn: '2026-10-01', target: { kind: 'bpm', exerciseId: 'legato-10', bpm: 110, baseline: 100 } })
    const d = data({ challenges: [c1], guitarSessions: [g(today, 60, [ex('legato-10', 110)], 1300)] })
    expect(settleChallenges(d, today)).toEqual([{ type: 'markDone', id: 'c1', doneOn: today }])
  })

  test('sortie longue : réussie avec une sortie assez longue depuis le début de l’objectif', () => {
    const c = challenge({ id: 'run', domain: 'sport', createdOn: '2026-10-01', target: { kind: 'longRun', km: 16 } })
    expect(planChallengeUpdates(data({ challenges: [c] }), today, [{ day: '2026-10-10', km: 15, pain: null }])).toEqual([])
    expect(planChallengeUpdates(data({ challenges: [c] }), today, [{ day: '2026-10-10', km: 16.2, pain: null }])).toEqual([
      { type: 'markDone', id: 'run', doneOn: today },
    ])
  })
})

describe('relance et version plus facile', () => {
  const twoExos = data({ guitarSessions: [g('2026-10-14', 30, [ex('legato-10', 100), ex('picking-10', 100)])] })

  test('rerollChallenge : replace + nouveau défi même niveau, rerolls + 1, cible différente', () => {
    const c: Challenge = challenge({
      id: 'c1',
      createdOn: '2026-10-10',
      blockedSince: '2026-10-12',
      target: { kind: 'bpm', exerciseId: 'legato-10', bpm: 120, baseline: 100 },
    })
    const u = rerollChallenge({ ...twoExos, challenges: [c] }, 'c1', today, deps)
    expect(u[0]).toEqual({ type: 'replace', id: 'c1' })
    const next = creates(u)[0]
    expect(next).toMatchObject({ level: 1, domain: 'guitar', rerolls: 1, status: 'active', createdOn: today, blockedSince: '2026-10-12' })
    expect(next.target).toMatchObject({ exerciseId: 'picking-10' })
  })

  test('rerollChallenge refusé à 2 relances', () => {
    const c = challenge({ id: 'c1', rerolls: 2 })
    expect(rerollChallenge({ ...twoExos, challenges: [c] }, 'c1', today, deps)).toEqual([])
  })

  test('rerollChallenge sans autre cible possible : refusé', () => {
    const c = challenge({ id: 'c1', target: { kind: 'bpm', exerciseId: 'scales-3', bpm: 78, baseline: null } }) // compte vide → seule cible possible
    expect(rerollChallenge(data({ challenges: [c] }), 'c1', today, deps)).toEqual([])
  })

  test('rerollChallenge : un défi relu du serveur (clés réordonnées par jsonb) n’est pas reproposé à l’identique', () => {
    // Postgres range les clés jsonb par longueur : { bpm, kind, baseline, exerciseId }.
    const target = { bpm: 78, kind: 'bpm', baseline: null, exerciseId: 'scales-3' } as ChallengeTarget
    const c = challenge({ id: 'c1', target })
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
