import { expect, test } from 'vitest'
import { g } from '../test/factories'
import { guitarWeek } from './guitarWeek'

test('guitarWeek : minutes par jour du lundi au dimanche, jours à 60 min', () => {
  const w = guitarWeek([g('2026-10-11', 90), g('2026-10-12', 35), g('2026-10-12', 25), g('2026-10-14', 20)], '2026-10-15')
  expect(w.days.map((d) => d.minutes)).toEqual([60, 0, 20, 0, 0, 0, 0])
  expect(w.goalDays).toBe(1)
})
