import { expect, test } from 'vitest'
import { challenge } from '../test/factories'
import { allLevels, domainLevel, globalLevel, totalXp } from './levels'

const done = (level: number, domain: 'guitar' | 'sport' = 'guitar') => challenge({ level, domain, status: 'done', doneOn: '2026-10-01' })

test('sous le seuil : pas de blocage', () => {
  expect(domainLevel('guitar', 800, [])).toEqual({ level: 1, xpInLevel: 800, perLevel: 1200, blocked: false, reserve: 0, unlockedXp: 800 })
})

test('seuil atteint sans défi réussi : bloqué, surplus en réserve', () => {
  expect(domainLevel('guitar', 1540, [])).toMatchObject({ level: 1, xpInLevel: 1200, blocked: true, reserve: 340, unlockedXp: 1200 })
})

test('défi réussi : la réserve passe au niveau suivant', () => {
  expect(domainLevel('guitar', 1540, [done(1)])).toMatchObject({ level: 2, xpInLevel: 340, blocked: false, reserve: 0, unlockedXp: 1540 })
})

test('versement plafonné au seuil suivant : on ne saute jamais un défi', () => {
  expect(domainLevel('guitar', 3000, [done(1)])).toMatchObject({ level: 2, xpInLevel: 1200, blocked: true, reserve: 600, unlockedXp: 2400 })
})

test('défi réussi en avance : passage immédiat au seuil', () => {
  expect(domainLevel('guitar', 1200, [done(1)])).toMatchObject({ level: 2, xpInLevel: 0, blocked: false })
})

test("les défis de l'autre domaine et les défis non « done » ne comptent pas", () => {
  expect(domainLevel('sport', 700, [done(1, 'guitar')]).blocked).toBe(true)
  expect(domainLevel('guitar', 1300, [challenge({ level: 1, status: 'replaced' })]).blocked).toBe(true)
})

test('sport : 600 XP par niveau', () => {
  expect(domainLevel('sport', 700, [done(1, 'sport')])).toMatchObject({ level: 2, xpInLevel: 100, perLevel: 600 })
})

test('global sans réserve', () => {
  expect(globalLevel(1200, 600)).toEqual({ level: 2, xpInLevel: 0, perLevel: 1800 })
  expect(globalLevel(0, 0)).toEqual({ level: 1, xpInLevel: 0, perLevel: 1800 })
})

test('totalXp', () => {
  expect(totalXp([{ xp: 40 }, { xp: 75 }])).toBe(115)
})

test('allLevels combine les deux domaines et le global sans réserve', () => {
  const d = {
    guitarSessions: [{ xp: 1540 }],
    sportSessions: [{ xp: 300 }],
    challenges: [],
  } as unknown as Parameters<typeof allLevels>[0]
  const l = allLevels(d)
  expect(l.guitar).toMatchObject({ level: 1, reserve: 340 })
  expect(l.sport).toMatchObject({ level: 1, xpInLevel: 300 })
  expect(l.global).toEqual({ level: 1, xpInLevel: 1500, perLevel: 1800 })
})
