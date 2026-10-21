import { expect, test } from 'vitest'
import { g, ss } from '../test/factories'
import { allLevels, domainLevel, globalLevel, weekBonusXp, XP_WEEK_GOAL } from './levels'

test('niveau : 600 XP par niveau, sans blocage', () => {
  expect(domainLevel('guitar', 0)).toEqual({ level: 1, xpInLevel: 0, perLevel: 600, total: 0 })
  expect(domainLevel('sport', 1250)).toEqual({ level: 3, xpInLevel: 50, perLevel: 600, total: 1250 })
  expect(globalLevel(700, 600)).toEqual({ level: 2, xpInLevel: 100, perLevel: 1200 })
})

test('objectif de la semaine tenu : +100 par discipline, à partir de la semaine du 19 oct.', () => {
  const guitar = ['19', '20', '21', '22', '23'].map((d) => g(`2026-10-${d}`, 30))
  const sport = ['19', '20', '21'].map((d) => ss([], `2026-10-${d}`))
  // Semaine d'avant le lot 4 : rien.
  const before = ['12', '13', '14', '15', '16'].map((d) => g(`2026-10-${d}`, 30))
  expect(weekBonusXp({ guitarSessions: [...before, ...guitar], sportSessions: sport }, '2026-10-24')).toEqual({ guitar: XP_WEEK_GOAL, sport: XP_WEEK_GOAL })
  // Objectif sport du plan plus haut : pas tenu.
  expect(weekBonusXp({ guitarSessions: guitar, sportSessions: sport }, '2026-10-24', () => 5).sport).toBe(0)
})

test('XP acquise gardée : la somme des séances, plus les bonus', () => {
  const sessions = [g('2026-10-01', 60, [], 900)]
  const levels = allLevels({ guitarSessions: sessions, sportSessions: [ss([], '2026-10-01', 'p', 300)] }, '2026-10-20')
  expect(levels.guitar).toMatchObject({ level: 2, total: 900 })
  expect(levels.global).toEqual({ level: 2, xpInLevel: 0, perLevel: 1200 })
})
