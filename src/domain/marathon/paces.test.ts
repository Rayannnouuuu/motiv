import { describe, expect, test } from 'vitest'
import { addDays } from '../date'
import { profile, TODAY } from './fixtures'
import { MAX_TIGHTENING, paces, PRUDENT_MARGIN, TRAIN_MARGIN, typicalPace } from './paces'

const m = profile({ level: { chrono: { distance: '10k', sec: 2880, day: TODAY } } })
const p = paces(m, TODAY)
const [mp] = p.secPerKm.marathon!
const run = (day: string, km: number, sec: number) => ({ day, km, sec })

describe('allures du modèle (sans sorties connues)', () => {
  test('footing et sortie longue : de 12 à 25 % plus lents que l’allure marathon', () => {
    // L'allure marathon est arrondie à la seconde : on tolère une seconde d'écart.
    expect(Math.abs(p.secPerKm.easy![0] - mp * 1.12)).toBeLessThanOrEqual(1)
    expect(Math.abs(p.secPerKm.easy![1] - mp * 1.22)).toBeLessThanOrEqual(1)
    expect(Math.abs(p.secPerKm.long![0] - mp * 1.15)).toBeLessThanOrEqual(1)
    expect(Math.abs(p.secPerKm.long![1] - mp * 1.25)).toBeLessThanOrEqual(1)
  })

  test('l’ordre reste logique : intervalles < seuil < marathon < footing < sortie longue < récupération', () => {
    const s = p.secPerKm
    expect(s.intervals![0]).toBeLessThan(s.threshold![0])
    expect(s.threshold![0]).toBeLessThan(s.marathon![0])
    expect(s.marathon![0]).toBeLessThan(s.easy![0])
    expect(s.easy![0]).toBeLessThan(s.long![0])
    expect(s.long![1]).toBeLessThan(s.recovery![1])
  })

  test('seuil et fractionné : marge d’entraînement plus exigeante que la marge de course', () => {
    expect(TRAIN_MARGIN).toBeLessThan(PRUDENT_MARGIN)
    const km15 = (2880 * (15 / 10) ** 1.06) / 15
    expect(p.secPerKm.threshold![0]).toBe(Math.round(km15 * TRAIN_MARGIN))
  })

  test('sans chrono : allures au ressenti, rien de chiffré', () => {
    expect(paces(profile({ level: { chrono: null } }), TODAY).secPerKm).toEqual({})
  })
})

describe('allure typique de tes sorties', () => {
  test('médiane des 6 dernières semaines, avec au moins 3 sorties de 3 km', () => {
    const runs = [
      run(addDays(TODAY, -3), 8, 8 * 420),
      run(addDays(TODAY, -10), 6, 6 * 450),
      run(addDays(TODAY, -20), 10, 10 * 400),
      run(addDays(TODAY, -60), 5, 5 * 300),
    ]
    expect(typicalPace(runs, TODAY)).toBe(420)
  })

  test('trop peu de sorties, trop courtes, trop anciennes ou sans durée : rien', () => {
    expect(typicalPace([run(addDays(TODAY, -3), 8, 3360), run(addDays(TODAY, -5), 8, 3360)], TODAY)).toBeNull()
    expect(typicalPace([run(addDays(TODAY, -3), 2, 840), run(addDays(TODAY, -5), 2, 840), run(addDays(TODAY, -6), 2, 840)], TODAY)).toBeNull()
    expect(typicalPace([run(addDays(TODAY, -50), 8, 3360), run(addDays(TODAY, -60), 8, 3360), run(addDays(TODAY, -70), 8, 3360)], TODAY)).toBeNull()
    expect(
      typicalPace(
        [
          { day: TODAY, km: 8 },
          { day: TODAY, km: 8 },
          { day: TODAY, km: 8 },
        ],
        TODAY,
      ),
    ).toBeNull()
  })
})

describe('calage sur tes sorties, resserré sur tout le programme', () => {
  const slow = 7 * 60 + 30 // 7:30 /km : plus lent que ce que ton chrono laisse prévoir
  const at = (day: string) => paces(m, day, slow)
  const start = at(m.startedOn)
  const peak = at(addDays(m.race.day, -21))

  test('au départ : ta sortie typique est en haut de la zone facile, toutes les zones sont plus lentes que le modèle', () => {
    for (const k of ['marathon', 'easy', 'long', 'recovery', 'threshold', 'intervals'] as const)
      expect(start.secPerKm[k]![0]).toBeGreaterThan(p.secPerKm[k]![0])
    expect(start.secPerKm.easy![1]).toBeGreaterThan(slow - 30)
    expect(start.secPerKm.easy![1]).toBeLessThan(slow + 30)
    expect(start.notes.join(' ')).toContain('Allures calées sur tes sorties récentes')
  })

  test('le travail démarre plus prudemment : fractionné et seuil plus lents, en proportion, que le footing', () => {
    const ratioStart = start.secPerKm.intervals![0] / p.secPerKm.intervals![0]
    const ratioEasy = start.secPerKm.easy![0] / p.secPerKm.easy![0]
    expect(ratioStart).toBeGreaterThan(ratioEasy)
  })

  test('les allures se resserrent avec le programme, de 7 % au plus pour le footing, sans repasser sous le modèle', () => {
    expect(peak.secPerKm.easy![0]).toBeLessThan(start.secPerKm.easy![0])
    expect(peak.secPerKm.easy![0] / start.secPerKm.easy![0]).toBeGreaterThanOrEqual(1 - MAX_TIGHTENING - 0.001)
    for (const k of ['marathon', 'easy', 'long', 'threshold', 'intervals'] as const) expect(peak.secPerKm[k]![0]).toBeGreaterThanOrEqual(p.secPerKm[k]![0])
    // Au pic, le travail a rejoint le reste : même échelle pour toutes les zones.
    expect(peak.secPerKm.intervals![0] / p.secPerKm.intervals![0]).toBeCloseTo(peak.secPerKm.easy![0] / p.secPerKm.easy![0], 1)
  })

  test('un coureur plus rapide que le modèle n’est pas ralenti, et rien n’est dit', () => {
    const fast = paces(m, TODAY, 300)
    expect(fast.secPerKm).toEqual(p.secPerKm)
    expect(fast.notes.join(' ')).not.toContain('calées')
  })
})
