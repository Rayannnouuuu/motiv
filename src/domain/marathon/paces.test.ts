import { describe, expect, test } from 'vitest'
import { profile, TODAY } from './fixtures'
import { paces, PRUDENT_MARGIN, TRAIN_MARGIN } from './paces'

const p = paces(profile({ level: { chrono: { distance: '10k', sec: 2880, day: TODAY } } }), TODAY)
const [mpFast] = p.secPerKm.marathon!

describe('allures', () => {
  test('footing et sortie longue : de 10 à 20 % plus lents que l’allure marathon', () => {
    // L'allure marathon est arrondie à la seconde : on tolère une seconde d'écart.
    expect(Math.abs(p.secPerKm.easy![0] - mpFast * 1.1)).toBeLessThanOrEqual(1)
    expect(Math.abs(p.secPerKm.easy![1] - mpFast * 1.2)).toBeLessThanOrEqual(1)
    expect(Math.abs(p.secPerKm.long![0] - mpFast * 1.12)).toBeLessThanOrEqual(1)
    expect(Math.abs(p.secPerKm.long![1] - mpFast * 1.22)).toBeLessThanOrEqual(1)
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
