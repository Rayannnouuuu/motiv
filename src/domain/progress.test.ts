import { describe, expect, test } from 'vitest'
import { data, ex, g, mkSong, set, ss } from '../test/factories'
import { gains, guitarSplit, kmPerWeek, paceSeries, recordWall, volumePerWeek, type RunDone } from './progress'

const today = '2026-10-15'
const runs: RunDone[] = [
  { day: '2026-06-02', km: 8, sec: 2880 },
  { day: '2026-10-06', km: 10, sec: 3300 },
  { day: '2026-10-08', km: 5, sec: 1500 },
  { day: '2026-10-13', km: 12, sec: 4200 },
]

describe('progress', () => {
  test('km par semaine : somme par lundi, semaines vides absentes', () => {
    expect(kmPerWeek(runs)).toEqual([
      { day: '2026-06-01', value: 8 },
      { day: '2026-10-05', value: 15 },
      { day: '2026-10-12', value: 12 },
    ])
  })

  test('allure : secondes par km, sorties sans durée ignorées', () => {
    expect(paceSeries([...runs.slice(0, 2), { day: '2026-10-09', km: 4, sec: 0 }])).toEqual([
      { day: '2026-06-02', value: 360 },
      { day: '2026-10-06', value: 330 },
    ])
  })

  test('volume : charge × reps par semaine', () => {
    expect(volumePerWeek(data({ sportSessions: [ss([set(50, 10), set(50, 8)], '2026-10-06'), ss([set(60, 5)], '2026-10-08')] }))).toEqual([
      { day: '2026-10-05', value: 1200 },
    ])
  })

  test('gains : km et plus longue sortie de la période, comparés à avant', () => {
    const g90 = gains(data(), runs, today, 90)
    expect(g90.km).toBe(27)
    expect(g90.longest).toEqual({ from: 8, to: 12 })
    expect(g90.tempo).toBeNull()
    expect(g90.strength).toBeNull()
  })

  test('gains : tempo et morceaux maîtrisés sur la période', () => {
    const d = data({
      guitarSessions: [g('2026-05-01', 30, [ex('legato-4', 80)]), g('2026-10-01', 30, [ex('legato-4', 92)])],
      songs: [mkSong({ status: 'mastered', masteredOn: '2026-10-02' }), mkSong({ id: 's2', status: 'mastered', masteredOn: '2026-01-02' })],
    })
    const r = gains(d, [], today, 90)
    expect(r.tempo).toMatchObject({ from: 80, to: 92 })
    expect(r.songs).toBe(1)
    expect(r.longest).toBeNull()
  })

  test('gains : historique tout entier dans la période, la première valeur sert de départ', () => {
    const d = data({ guitarSessions: [g('2026-09-01', 30, [ex('legato-4', 80)]), g('2026-10-01', 30, [ex('legato-4', 92)])] })
    expect(gains(d, [], today, 90).tempo).toMatchObject({ from: 80, to: 92 })
    expect(gains(data({ guitarSessions: [g('2026-10-01', 30, [ex('legato-4', 92)])] }), [], today, 90).tempo).toBeNull()
  })

  test('répartition guitare : durée partagée entre les exos et morceaux, séance sans détail à part', () => {
    const d = data({ guitarSessions: [g('2026-10-05', 30, [ex('legato-4', 90)]), g('2026-10-06', 20), g('2026-01-01', 99)] })
    const split = guitarSplit(d, '2026-10-01', today)
    expect(split.reduce((t, x) => t + x.minutes, 0)).toBe(50)
    expect(split).toContainEqual({ label: 'Sans détail', minutes: 20 })
  })

  test('mur des records : récent d’abord, un premier essai n’est pas un record', () => {
    const d = data({ guitarSessions: [g('2026-10-01', 30, [ex('legato-4', 80)]), g('2026-10-04', 30, [ex('legato-4', 84)])] })
    const wall = recordWall(d, runs)
    expect(wall.map((r) => r.label)).toEqual(['Plus longue sortie · 12 km', 'Plus longue sortie · 10 km', 'Legato 4 · 84 bpm'])
    expect(wall[0].domain).toBe('sport')
  })
})
