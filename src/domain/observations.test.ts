import { describe, expect, test } from 'vitest'
import { data, g, ss } from '../test/factories'
import { observations } from './observations'

const today = '2026-10-21'
const at = (day: string, min: number, hourUtc = 16, desire = 3, flow = 3) => ({
  ...g(day, min),
  createdAt: `${day}T${String(hourUtc).padStart(2, '0')}:00:00Z`,
  desireRating: desire as 3,
  flowRating: flow as 3,
})

describe('observations croisées', () => {
  const sportDays = ['2026-09-01', '2026-09-05', '2026-09-10', '2026-09-15']
  const base = {
    sportSessions: sportDays.map((d) => ss([], d)),
    guitarSessions: [...sportDays.map((d) => at(d, 45)), ...['2026-09-02', '2026-09-06', '2026-09-11', '2026-09-16'].map((d) => at(d, 30))],
  }

  test('jours de sport : 15 min de plus, avec le nombre de séances', () => {
    expect(observations(data(base), [], today)).toEqual([
      { text: 'Tes séances guitare durent 15 min de plus les jours où tu fais du sport.', basis: '4 séances avec sport, 4 sans' },
    ])
  })

  test('moins de 4 semaines de données : rien', () => {
    expect(observations(data(base), [], '2026-09-20')).toEqual([])
  })

  test('écart trop faible ou trop peu de séances : rien', () => {
    const flat = { ...base, guitarSessions: base.guitarSessions.map((s) => ({ ...s, durationMin: 30 })) }
    expect(observations(data(flat), [], today)).toEqual([])
    expect(observations(data({ ...base, guitarSessions: base.guitarSessions.slice(2) }), [], today)).toEqual([])
  })

  test('matin / soir (heure de Paris) et sommeil', () => {
    const morning = ['2026-09-01', '2026-09-02', '2026-09-03'].map((d) => at(d, 30, 6, 3, 5))
    const evening = ['2026-09-04', '2026-09-05', '2026-09-06'].map((d) => at(d, 30, 18, 3, 3))
    const checkins = [
      ...['2026-09-01', '2026-09-02', '2026-09-03'].map((day) => ({ day, sleepHours: 8, energy: null })),
      ...['2026-09-04', '2026-09-05', '2026-09-06'].map((day) => ({ day, sleepHours: 5, energy: null })),
    ]
    const rested = [...morning.map((s) => ({ ...s, durationMin: 40 })), ...evening]
    const out = observations(data({ guitarSessions: rested }), checkins, today)
    expect(out.map((o) => o.text)).toEqual([
      'Tu perds plus la notion du temps le matin (5,0 contre 3,0 sur 5).',
      'Après 7 h de sommeil ou plus, tes séances guitare durent 10 min de plus.',
    ])
    expect(out[0].basis).toBe('3 séances le matin, 3 le soir')
  })
})
