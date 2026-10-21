import { expect, test } from 'vitest'
import { focusOf, reviewDue, type WeeklyReview } from './weeklyReview'

const review = (week: string, focus = 'Legato propre'): WeeklyReview => ({ week, worked: '', blocked: '', focus, at: week })

test('bilan à faire le dimanche pour la semaine qui finit, ou le lundi pour celle d’avant ; pas deux fois', () => {
  expect(reviewDue([], '2026-10-25')).toBe('2026-10-19') // dimanche
  expect(reviewDue([review('2026-10-19')], '2026-10-25')).toBeNull()
  expect(reviewDue([], '2026-10-26')).toBe('2026-10-19') // lundi, rattrapage
  expect(reviewDue([], '2026-10-22')).toBeNull() // jeudi
})

test('le focus de dimanche s’affiche toute la semaine suivante', () => {
  expect(focusOf([review('2026-10-19')], '2026-10-28')).toBe('Legato propre')
  expect(focusOf([review('2026-10-19', '  ')], '2026-10-28')).toBeNull()
  expect(focusOf([review('2026-10-19')], '2026-10-22')).toBeNull()
})
