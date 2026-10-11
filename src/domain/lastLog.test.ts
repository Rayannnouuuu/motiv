import { expect, test } from 'vitest'
import { g, ss } from '../test/factories'
import { lastLog } from './lastLog'

test('aucun log', () => {
  expect(lastLog({ guitarSessions: [], sportSessions: [] })).toBeNull()
})

test('le plus récemment enregistré, guitare ou sport', () => {
  const guitar = { ...g('2026-10-15', 30), createdAt: '2026-10-15T20:00:00Z' }
  const sport = { ...ss([], '2026-10-15'), createdAt: '2026-10-15T18:00:00Z' }
  expect(lastLog({ guitarSessions: [guitar], sportSessions: [sport] })).toEqual({ kind: 'guitar', session: guitar })
  // Un log daté d'hier mais enregistré en dernier reste le dernier log.
  const lateSport = { ...ss([], '2026-10-14'), createdAt: '2026-10-15T21:00:00Z' }
  expect(lastLog({ guitarSessions: [guitar], sportSessions: [sport, lateSport] })?.session).toBe(lateSport)
})
