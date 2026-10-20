import { describe, expect, test } from 'vitest'
import { historyOf, type Done } from './history'
import type { Session, SetRecord } from './model'
import { guitarTarget, sportTarget } from './targets'

const done = (...sets: SetRecord[]): Done => ({ sessionId: 's', day: '2026-10-01', sets })

describe('guitarTarget', () => {
  test('sans historique : le BPM de départ', () => {
    expect(guitarTarget([], 54)).toEqual({ bpm: 54, why: 'Premier passage : on démarre à 54 bpm.' })
  })

  test('propre 3 séances de suite → +4 BPM depuis le plus lent des trois', () => {
    const h = [done({ bpm: 74, clean: true }), done({ bpm: 72, clean: true }), done({ bpm: 72, clean: true }), done({ bpm: 60 })]
    expect(guitarTarget(h, 54)).toEqual({ bpm: 76, why: 'Propre 3 séances de suite à 72 bpm : on passe à 76.' })
  })

  test('deux séances propres seulement : même tempo, il en reste une', () => {
    const h = [done({ bpm: 72, clean: true }), done({ bpm: 72, clean: true }), done({ bpm: 72 })]
    expect(guitarTarget(h, 54)).toEqual({ bpm: 72, why: 'Encore 1 séance propre à 72 bpm pour monter.' })
  })

  test('ancien « tempo max » (jamais propre) : point de départ, pas validé', () => {
    expect(guitarTarget([done({ bpm: 55 })], 46)).toEqual({ bpm: 55, why: 'Joue 55 bpm proprement : 3 séances propres et on monte.' })
  })

  test('séance sans tempo noté : on garde le départ', () => {
    expect(guitarTarget([done({})], 46).bpm).toBe(46)
  })
})

describe('sportTarget (double progression)', () => {
  const bench = { metric: 'load_reps' as const, body: 'upper' as const, repRange: [6, 10] as [number, number] }
  const squat = { ...bench, body: 'lower' as const }

  test('haut de la fourchette sur toutes les séries : +2,5 kg en haut, +5 kg en bas, retour au bas', () => {
    const h = [done({ loadKg: 80, reps: 10 }, { loadKg: 80, reps: 10 }, { loadKg: 80, reps: 11 })]
    expect(sportTarget(h, bench)).toEqual({ loadKg: 82.5, reps: 6, why: '10 reps sur toutes les séries : +2,5 kg, retour à 6 reps.' })
    expect(sportTarget(h, squat)).toMatchObject({ loadKg: 85, reps: 6 })
  })

  test('pas encore en haut : même charge, une rep de plus que la série la plus faible', () => {
    const h = [done({ loadKg: 60, reps: 8 }, { loadKg: 80, reps: 8 }, { loadKg: 80, reps: 7 })]
    expect(sportTarget(h, bench)).toEqual({ loadKg: 80, reps: 8, why: "Même charge : vise 8 reps, jusqu'à 10 sur toutes les séries pour monter." })
  })

  test('la série d’échauffement plus légère ne compte pas', () => {
    const h = [done({ loadKg: 40, reps: 5 }, { loadKg: 80, reps: 10 }, { loadKg: 80, reps: 10 })]
    expect(sportTarget(h, bench)?.loadKg).toBe(82.5)
  })

  test('poids du corps : une répétition de plus', () => {
    const h = [done({ loadKg: 0, reps: 8 }, { loadKg: 0, reps: 6 })]
    expect(sportTarget(h, { metric: 'reps', body: 'upper', repRange: [6, 10] })).toEqual({
      loadKg: 0,
      reps: 7,
      why: 'Une répétition de plus que ta série la plus faible (6).',
    })
  })

  test('première fois, fourchette inconnue, durée', () => {
    expect(sportTarget([], bench)).toEqual({ reps: 6, why: 'Première fois : choisis une charge confortable.' })
    expect(sportTarget([done({ loadKg: 50, reps: 9 })], { ...bench, repRange: null })).toMatchObject({ loadKg: 50, reps: 9 })
    expect(sportTarget([done({ durationSec: 60 })], { metric: 'duration', body: 'upper', repRange: null })).toBeNull()
  })
})

describe('historyOf', () => {
  const s = (id: string, day: string, createdAt: string, exerciseId: string, sets: SetRecord[]): Session => ({
    id,
    discipline: 'sport',
    day,
    createdAt,
    durationMin: 50,
    isLight: false,
    flowScore: 3,
    desireScore: 3,
    blocks: [{ type: 'main', entries: [{ exerciseId, templateEntryId: `${id}-pe`, sets }] }],
    xp: 0,
  })

  test('suit le mouvement d’un programme à l’autre, plus récent d’abord', () => {
    const sessions = [
      s('a', '2026-10-01', '2026-10-01T10:00:00Z', 'squat', [{ loadKg: 80, reps: 8 }]),
      s('b', '2026-10-08', '2026-10-08T10:00:00Z', 'squat', [{ loadKg: 85, reps: 8 }]),
      s('c', '2026-10-08', '2026-10-08T18:00:00Z', 'dips', [{ loadKg: 0, reps: 10 }]),
    ]
    expect(historyOf(sessions, 'squat').map((d) => d.sessionId)).toEqual(['b', 'a'])
  })
})
