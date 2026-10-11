import { expect, test } from 'vitest'
import { addDays, daysBetween, todayParis, weekStart } from './date'

test('00 h 30 à Paris en été = nouveau jour', () => {
  expect(todayParis(new Date('2026-07-14T22:30:00Z'))).toBe('2026-07-15')
})

test('23 h 30 à Paris en hiver = même jour', () => {
  expect(todayParis(new Date('2026-01-10T22:30:00Z'))).toBe('2026-01-10')
})

test("addDays traverse les mois et le changement d'heure", () => {
  expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
})

test('weekStart = lundi', () => {
  expect(weekStart('2026-10-11')).toBe('2026-10-05') // dimanche
  expect(weekStart('2026-10-05')).toBe('2026-10-05') // lundi
})

test('daysBetween', () => {
  expect(daysBetween('2026-10-01', '2026-10-15')).toBe(14)
  expect(daysBetween('2026-10-15', '2026-10-01')).toBe(-14)
})
