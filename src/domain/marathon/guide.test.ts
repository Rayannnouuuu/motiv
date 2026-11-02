import { describe, expect, test } from 'vitest'
import { profile, TODAY } from './fixtures'
import { generatePlan, guideRun, runSegments, type Plan, type Phase } from './plan'

const plan: Plan = generatePlan(profile({ level: { chrono: { distance: '10k', sec: 2880, day: TODAY } } }), 78, [], TODAY)
const dayOf = (phase: Phase) => plan.weeks.find((w) => w.phase === phase && !w.deload)!.start

describe('guide d’une sortie ajoutée à la main', () => {
  test('la sortie longue suit le plan : facile et régulière, de l’allure course sur la fin seulement en phase spécifique', () => {
    const base = guideRun('long', 20, plan, 'marathon', dayOf('base'))
    const dev = guideRun('long', 20, plan, 'marathon', dayOf('development'))
    const spec = guideRun('long', 20, plan, 'marathon', dayOf('specific'))
    expect(base).toMatchObject({ kind: 'long', km: 20, pace: 'long', fastKm: 0, detail: 'Sortie longue, régulière et facile' })
    expect(dev).toMatchObject({ kind: 'long', fastKm: 0, detail: 'Sortie longue, régulière et facile' })
    expect(spec.fastKm).toBe(5)
    expect(spec.detail).toBe('Sortie longue dont 5 km à allure course sur la fin')
    // Une sortie longue reste une sortie longue : jamais de blocs de fractionné.
    for (const r of [base, dev, spec]) expect(r.segments).toEqual([])
  })

  test('une semaine allégée garde la sortie longue facile', () => {
    const deload = plan.weeks.find((w) => w.deload && w.phase !== 'base')!
    expect(guideRun('long', 20, plan, 'marathon', deload.start).fastKm).toBe(0)
  })

  test('seuil et fractionné : plus de répétitions en spécifique qu’en développement ; la distance choisie est gardée', () => {
    const blocks = (kind: 'threshold' | 'intervals', phase: Phase) =>
      guideRun(kind, 9, plan, 'marathon', dayOf(phase)).segments.filter((s) => s.pace === kind).length
    expect(blocks('intervals', 'development')).toBe(5)
    expect(blocks('intervals', 'specific')).toBe(6)
    const threshold = guideRun('threshold', 9, plan, 'marathon', dayOf('specific'))
    expect(threshold.km).toBe(9)
    expect(threshold.segments.filter((s) => s.pace === 'threshold')).toHaveLength(3)
    expect(threshold.pace).toBe('threshold')
  })

  test('footing et récupération : facile, avec leur allure', () => {
    expect(guideRun('easy', 8, plan, 'marathon', dayOf('base'))).toMatchObject({ pace: 'easy', detail: 'En aisance : tu peux parler en phrases', segments: [] })
    expect(guideRun('recovery', 5, plan, 'marathon', dayOf('base'))).toMatchObject({ pace: 'recovery', km: 5 })
  })

  test('sans plan marathon : la base, sans blocs chiffrés', () => {
    const run = guideRun('long', 15, null, 'marathon', '2026-11-04')
    expect(run).toMatchObject({ kind: 'long', km: 15, fastKm: 0, detail: 'Sortie longue, régulière et facile' })
    expect(runSegments(run, null)).toEqual([])
  })
})

describe('blocs pour le minuteur', () => {
  test('sortie longue de spécifique : facile puis allure course, la durée suit les allures du plan', () => {
    const run = guideRun('long', 20, plan, 'marathon', dayOf('specific'))
    const segs = runSegments(run, plan)
    expect(segs.map((s) => [s.label, s.pace])).toEqual([
      ['Facile', 'long'],
      ['Allure course', 'marathon'],
    ])
    const longPace = plan.paces.secPerKm.long![1]
    expect(segs[0].sec).toBe(Math.round(15 * longPace))
    expect(segs[1].sec).toBeLessThan(Math.round(5 * longPace))
  })

  test('sortie longue de base : un seul bloc régulier', () => {
    const segs = runSegments(guideRun('long', 12, plan, 'marathon', dayOf('base')), plan)
    expect(segs).toHaveLength(1)
    expect(segs[0]).toMatchObject({ label: 'Régulier et facile', pace: 'long' })
  })

  test('une sortie du plan garde ses blocs ; la sortie longue du plan en reçoit', () => {
    const interval = plan.weeks.flatMap((w) => w.runs).find((r) => r.kind === 'intervals')!
    expect(runSegments(interval, plan)).toBe(interval.segments)
    const long = plan.weeks.flatMap((w) => w.runs).find((r) => r.kind === 'long' && r.segments.length === 0)!
    expect(runSegments(long, plan).length).toBeGreaterThan(0)
  })

  test('allure course : échauffement, allure course, retour au calme', () => {
    const segs = runSegments(guideRun('racePace', 12, plan, 'marathon', dayOf('specific')), plan)
    expect(segs.map((s) => s.label)).toEqual(['Échauffement facile', 'Allure course', 'Retour au calme'])
  })

  test('pas de distance : pas de blocs', () => {
    expect(runSegments(guideRun('long', 0, plan, 'marathon', dayOf('base')), plan)).toEqual([])
  })
})
