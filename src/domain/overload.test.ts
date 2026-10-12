import { describe, expect, test } from 'vitest'
import { pe, set, ss } from '../test/factories'
import { suggestLoad } from './overload'
import type { SportSet } from './types'

const today = '2026-10-15'
const bench = pe({ id: 'a', targetSets: 4, targetReps: 8 })

/** Séries numérotées dans l'ordre : [charge, reps]. */
const sets = (...xs: [number, number][]): SportSet[] => xs.map(([w, r], i) => set(w, r, 'a', i + 1))

describe('suggestLoad', () => {
  test('jamais fait : 0 kg, reps visées, pas de phrase', () => {
    expect(suggestLoad(bench, [], today)).toEqual({ weightKg: 0, reps: 8, trend: 'new', hint: null })
    expect(suggestLoad(bench, [ss([set(60, 8, 'b')], '2026-10-08')], today).trend).toBe('new')
  })

  test('4×8 à 62,5 validé → 65 kg ↑', () => {
    const history = [ss(sets([62.5, 8], [62.5, 8], [62.5, 8], [62.5, 8]), '2026-10-08')]
    expect(suggestLoad(bench, history, today)).toEqual({
      weightKg: 65,
      reps: 8,
      trend: 'up',
      hint: "↑ 65 kg aujourd'hui : tu as validé 4×8 à 62,5 kg",
    })
  })

  test('la dernière séance compte, pas la plus lourde de l’historique', () => {
    const history = [
      ss(sets([70, 8], [70, 8], [70, 8], [70, 8]), '2026-10-01'),
      ss(sets([60, 8], [60, 8], [60, 6], [60, 6]), '2026-10-08'),
    ]
    expect(suggestLoad(bench, history, today)).toMatchObject({ weightKg: 60, trend: 'same' })
  })

  test('même jour : la séance créée en dernier compte', () => {
    const early = { ...ss(sets([60, 8], [60, 8], [60, 8], [60, 8]), '2026-10-08'), createdAt: '2026-10-08T08:00:00Z' }
    const late = { ...ss(sets([50, 8], [50, 6]), '2026-10-08'), createdAt: '2026-10-08T19:00:00Z' }
    expect(suggestLoad(bench, [late, early], today).weightKg).toBe(50)
  })

  test('série d’essai 70×3 et échauffement ignorés', () => {
    const history = [ss(sets([40, 10], [62.5, 8], [62.5, 8], [62.5, 8], [62.5, 8], [70, 3]), '2026-10-08')]
    expect(suggestLoad(bench, history, today)).toMatchObject({ weightKg: 65, reps: 8, trend: 'up' })
  })

  test('égalité de séries entre deux charges → la plus lourde', () => {
    const history = [ss(sets([60, 8], [60, 8], [62.5, 8], [62.5, 7]), '2026-10-08')]
    expect(suggestLoad(bench, history, today)).toEqual({
      weightKg: 62.5,
      reps: 8,
      trend: 'same',
      hint: 'Vise 4×8 à 62,5 kg (dernière fois 8·7)',
    })
  })

  describe('reprise après plus de 3 semaines', () => {
    test('90 % au cran de 2,5 kg inférieur', () => {
      const history = [ss(sets([62.5, 8], [62.5, 8], [62.5, 8], [62.5, 8]), '2026-09-20')]
      expect(suggestLoad(bench, history, today)).toEqual({
        weightKg: 55,
        reps: 8,
        trend: 'down',
        hint: 'Reprise en douceur : 55 kg après 3 semaines',
      })
    })

    test('21 jours pile : pas encore une reprise', () => {
      const history = [ss(sets([62.5, 8], [62.5, 8], [62.5, 8], [62.5, 8]), '2026-09-24')]
      expect(suggestLoad(bench, history, today).trend).toBe('up')
    })

    test('2,5 kg ou moins : charge gardée', () => {
      const history = [ss(sets([2.5, 8]), '2026-08-01')]
      expect(suggestLoad(bench, history, today)).toMatchObject({ weightKg: 2.5, trend: 'down', hint: 'Reprise en douceur : 2,5 kg après 10 semaines' })
    })

    test('poids du corps', () => {
      const history = [ss(sets([0, 12], [0, 12]), '2026-09-01')]
      expect(suggestLoad(bench, history, today)).toEqual({ weightKg: 0, reps: 8, trend: 'down', hint: 'Reprise en douceur après 6 semaines' })
    })
  })

  describe('poids du corps', () => {
    test('objectif validé → une rep de plus que le max', () => {
      const history = [ss(sets([0, 10], [0, 9], [0, 8], [0, 8]), '2026-10-08')]
      expect(suggestLoad(bench, history, today)).toEqual({
        weightKg: 0,
        reps: 11,
        trend: 'up',
        hint: "↑ 11 reps aujourd'hui (dernière fois 10·9·8·8)",
      })
    })

    test('objectif pas atteint → on le revise', () => {
      const history = [ss(sets([0, 8], [0, 8], [0, 7]), '2026-10-08')]
      expect(suggestLoad(bench, history, today)).toEqual({
        weightKg: 0,
        reps: 8,
        trend: 'same',
        hint: 'Vise 4×8 (dernière fois 8·8·7)',
      })
    })
  })

  describe('charge légère (< 20 kg) : d’abord des reps', () => {
    const curl = pe({ id: 'a', targetSets: 3, targetReps: 10 })

    test('reps + 1 sur la moins bonne des séries validées', () => {
      const history = [ss(sets([12.5, 11], [12.5, 10], [12.5, 10], [12.5, 6]), '2026-10-08')]
      expect(suggestLoad(curl, history, today)).toEqual({
        weightKg: 12.5,
        reps: 11,
        trend: 'up',
        hint: "↑ 11 reps à 12,5 kg aujourd'hui",
      })
    })

    test('à R + 4 reps : cran de charge', () => {
      const history = [ss(sets([12.5, 14], [12.5, 14], [12.5, 14]), '2026-10-08')]
      expect(suggestLoad(curl, history, today)).toMatchObject({ weightKg: 15, reps: 10, trend: 'up' })
    })
  })

  describe('objectif pas validé', () => {
    test('deux séances ratées à la même charge → décharge', () => {
      const history = [
        ss(sets([80, 8], [80, 7], [80, 6], [80, 6]), '2026-10-01'),
        ss(sets([80, 8], [80, 8], [80, 7], [80, 6]), '2026-10-08'),
      ]
      expect(suggestLoad(bench, history, today)).toEqual({
        weightKg: 70,
        reps: 8,
        trend: 'down',
        hint: 'Décharge : 70 kg pour repartir plus fort',
      })
    })

    test('séance d’avant validée à la même charge : on revise', () => {
      const history = [
        ss(sets([80, 8], [80, 8], [80, 8], [80, 8]), '2026-10-01'),
        ss(sets([80, 8], [80, 8], [80, 7], [80, 6]), '2026-10-08'),
      ]
      expect(suggestLoad(bench, history, today)).toEqual({
        weightKg: 80,
        reps: 8,
        trend: 'same',
        hint: 'Vise 4×8 à 80 kg (dernière fois 8·8·7·6)',
      })
    })

    test('séance d’avant ratée à une autre charge : on revise', () => {
      const history = [
        ss(sets([77.5, 8], [77.5, 6]), '2026-10-01'),
        ss(sets([80, 8], [80, 8], [80, 7], [80, 6]), '2026-10-08'),
      ]
      expect(suggestLoad(bench, history, today)).toMatchObject({ weightKg: 80, trend: 'same' })
    })

    test('reps de la dernière fois dans l’ordre des séries', () => {
      const history = [ss([set(80, 6, 'a', 4), set(80, 8, 'a', 1), set(80, 7, 'a', 3), set(80, 8, 'a', 2)], '2026-10-08')]
      expect(suggestLoad(bench, history, today).hint).toBe('Vise 4×8 à 80 kg (dernière fois 8·8·7·6)')
    })
  })
})
