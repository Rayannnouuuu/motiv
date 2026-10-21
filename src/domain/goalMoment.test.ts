import { describe, expect, test } from 'vitest'
import { g, ss } from '../test/factories'
import { guitarMoment, sportMoment } from './goalMoment'

const today = '2026-10-15' // jeudi, semaine du lundi 12

describe('guitarMoment', () => {
  test('20 puis 15 min : la séance du jour compte (2/5)', () => {
    const log = g(today, 15)
    expect(guitarMoment([g('2026-10-12', 30), g(today, 20), log], log.id, today)).toEqual({ kind: 'guitarCounted', done: 2, goal: 5 })
  })
  test('20 min seulement : il en manque 10', () => {
    const log = g(today, 20)
    expect(guitarMoment([log], log.id, today)).toEqual({ kind: 'guitarRemaining', beforeMin: 0, todayMin: 20, remainingMin: 10 })
  })
  test('déjà 30 min aujourd’hui : bonus', () => {
    const log = g(today, 20)
    expect(guitarMoment([g(today, 30), log], log.id, today)).toEqual({ kind: 'guitarBonus', done: 1, goal: 5 })
  })
  test('5e séance de la semaine : objectif tenu', () => {
    const sunday = '2026-10-18'
    const log = g(sunday, 30)
    const before = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'].map((d) => g(d, 30))
    expect(guitarMoment([...before, log], log.id, sunday)).toEqual({ kind: 'weekDone', discipline: 'guitar', done: 5 })
  })
  test('log d’une autre semaine : rien', () => {
    const log = g('2026-10-09', 60)
    expect(guitarMoment([log], log.id, today)).toBeNull()
  })
})

describe('sportMoment', () => {
  test('2e séance : encore une', () => {
    const log = ss([], today)
    expect(sportMoment([ss([], '2026-10-12'), log], log.id, today)).toEqual({ kind: 'weekProgress', done: 2, remaining: 1, goal: 3 })
  })
  test('3e séance : objectif tenu ; avec l’objectif du plan (5), il en reste 2', () => {
    const log = ss([], today)
    const sessions = [ss([], '2026-10-12'), ss([], '2026-10-13'), log]
    expect(sportMoment(sessions, log.id, today)).toEqual({ kind: 'weekDone', discipline: 'sport', done: 3 })
    expect(sportMoment(sessions, log.id, today, 5)).toEqual({ kind: 'weekProgress', done: 3, remaining: 2, goal: 5 })
  })
  test('4e séance : bonus', () => {
    const log = ss([], today)
    expect(sportMoment([ss([], '2026-10-12'), ss([], '2026-10-13'), ss([], '2026-10-14'), log], log.id, today)).toEqual({ kind: 'weekBonus', done: 4 })
  })
})
