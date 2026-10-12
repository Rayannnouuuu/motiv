import { describe, expect, test } from 'vitest'
import { g, ss } from '../test/factories'
import { addDays } from './date'
import { guitarMoment, sportMoment } from './goalMoment'

const today = '2026-10-15' // jeudi, semaine du lundi 12

/** `n` jours de 60 min, du jour `from` (inclus) en remontant. */
const fullDays = (n: number, from = addDays(today, -1)) => Array.from({ length: n }, (_, i) => g(addDays(from, -i), 60))

describe('guitarMoment', () => {
  test('35 min puis 25 : série tenue, 13 jours', () => {
    const log = g(today, 25)
    const sessions = [...fullDays(12), g(today, 35), log]
    expect(guitarMoment(sessions, log.id, today)).toEqual({ kind: 'streakKept', days: 13, milestone: false })
  })

  test('7e jour : palier', () => {
    const log = g(today, 60)
    expect(guitarMoment([...fullDays(6), log], log.id, today)).toEqual({ kind: 'streakKept', days: 7, milestone: true })
  })

  test('un seul log de 30 : 30 min restantes, série à lancer', () => {
    const log = g(today, 30)
    expect(guitarMoment([log], log.id, today)).toEqual({ kind: 'guitarRemaining', beforeMin: 0, todayMin: 30, remainingMin: 30, days: 0 })
  })

  test('minutes restantes : la série comptée est celle qui s’arrête hier', () => {
    const log = g(today, 20)
    const sessions = [...fullDays(4), g(today, 15), log]
    expect(guitarMoment(sessions, log.id, today)).toEqual({ kind: 'guitarRemaining', beforeMin: 15, todayMin: 35, remainingMin: 25, days: 4 })
  })

  test('60 puis 20 : bonus, série déjà tenue', () => {
    const log = g(today, 20)
    const sessions = [...fullDays(2), g(today, 60), log]
    expect(guitarMoment(sessions, log.id, today)).toEqual({ kind: 'guitarBonus', days: 3 })
  })

  test('« Hier » qui recolle la série : série réparée', () => {
    const log = g(addDays(today, -1), 60)
    const sessions = [g(addDays(today, -2), 60), g(today, 60), log]
    expect(guitarMoment(sessions, log.id, today)).toEqual({ kind: 'streakRepaired', days: 3, milestone: false })
  })

  test('« Hier » qui complète la veille : 40 + 20 min', () => {
    const log = g(addDays(today, -1), 20)
    const sessions = [...fullDays(5, addDays(today, -2)), g(addDays(today, -1), 40), log]
    expect(guitarMoment(sessions, log.id, today)).toEqual({ kind: 'streakRepaired', days: 6, milestone: false })
  })

  test('« Hier » qui atteint un palier', () => {
    const log = g(addDays(today, -1), 60)
    const sessions = [...fullDays(6, addDays(today, -2)), log]
    expect(guitarMoment(sessions, log.id, today)).toEqual({ kind: 'streakRepaired', days: 7, milestone: true })
  })

  test('« Hier » déjà validé ou encore incomplet : rien', () => {
    const extra = g(addDays(today, -1), 20)
    expect(guitarMoment([...fullDays(3), extra], extra.id, today)).toBeNull()
    const short = g(addDays(today, -1), 30)
    expect(guitarMoment([short], short.id, today)).toBeNull()
  })

  test('autre jour : rien', () => {
    const log = g(addDays(today, -3), 60)
    expect(guitarMoment([log], log.id, today)).toBeNull()
  })

  test('log absent : rien', () => {
    expect(guitarMoment([g(today, 60)], 'inconnu', today)).toBeNull()
  })
})

describe('sportMoment', () => {
  // Semaine précédente validée (lundi 5 → dimanche 11).
  const lastWeek = [ss([], '2026-10-05'), ss([], '2026-10-07'), ss([], '2026-10-09')]

  test('3e séance de la semaine : semaine validée', () => {
    const log = ss([], today)
    const sessions = [...lastWeek, ss([], '2026-10-12'), ss([], '2026-10-13'), log]
    expect(sportMoment(sessions, log.id, today)).toEqual({ kind: 'weekDone', weeks: 2, milestone: false })
  })

  test('4e semaine d’affilée : palier', () => {
    const weeks = [0, 7, 14].flatMap((back) => [0, 1, 2].map((d) => ss([], addDays('2026-10-05', d - back))))
    const log = ss([], today)
    const sessions = [...weeks, ss([], '2026-10-12'), ss([], '2026-10-13'), log]
    expect(sportMoment(sessions, log.id, today)).toEqual({ kind: 'weekDone', weeks: 4, milestone: true })
  })

  test('2e séance : encore une', () => {
    const log = ss([], today)
    expect(sportMoment([...lastWeek, ss([], '2026-10-12'), log], log.id, today)).toEqual({ kind: 'weekProgress', done: 2, remaining: 1 })
  })

  test('4e séance : bonus', () => {
    const log = ss([], today)
    const sessions = [ss([], '2026-10-12'), ss([], '2026-10-13'), ss([], '2026-10-14'), log]
    expect(sportMoment(sessions, log.id, today)).toEqual({ kind: 'weekBonus', done: 4 })
  })

  test('log d’une autre semaine : rien', () => {
    const log = ss([], '2026-10-11')
    expect(sportMoment([log], log.id, today)).toBeNull()
  })

  test('log absent : rien', () => {
    expect(sportMoment([ss([], today)], 'inconnu', today)).toBeNull()
  })
})
