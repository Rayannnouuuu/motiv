import { expect, test } from 'vitest'
import { program, ss } from '../test/factories'
import { upcomingPrograms } from './progression'
import { sportWeek } from './sportWeek'

test('sportWeek : lundi → dimanche, séances par jour, reste à faire', () => {
  const w = sportWeek([ss([], '2026-10-11'), ss([], '2026-10-12'), ss([], '2026-10-14')], '2026-10-15')
  expect(w.days.map((d) => d.day)).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'])
  expect(w.days.map((d) => d.sessions.length)).toEqual([1, 0, 1, 0, 0, 0, 0])
  expect(w).toMatchObject({ done: 2, remaining: 1 })
  expect(sportWeek([ss([], '2026-10-12'), ss([], '2026-10-13'), ss([], '2026-10-14'), ss([], '2026-10-15')], '2026-10-15').remaining).toBe(0)
})

test('upcomingPrograms : rotation à partir de la prochaine séance', () => {
  const a = program({ id: 'a', name: 'Push', position: 0 })
  const b = program({ id: 'b', name: 'Pull', position: 1 })
  const c = program({ id: 'c', name: 'Legs', position: 2 })
  expect(upcomingPrograms([a, b, c], [ss([], '2026-10-14', 'b')], 3).map((p) => p.name)).toEqual(['Legs', 'Push', 'Pull'])
  expect(upcomingPrograms([a, b], [], 3).map((p) => p.name)).toEqual(['Push', 'Pull'])
  expect(upcomingPrograms([], [], 3)).toEqual([])
})
