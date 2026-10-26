import { describe, expect, test } from 'vitest'
import { beatPeriods, consistency, readRhythm, stabilityBars } from './rhythm'

/** Attaques régulières : n notes, intervalle en secondes, petit bruit facultatif. */
const notes = (n: number, every: number, jitter: (i: number) => number = () => 0) => Array.from({ length: n }, (_, i) => 1 + i * every + jitter(i))

describe('rythme joué', () => {
  test('noires à 100 bpm : dans le temps, aiguille au centre, stable', () => {
    expect(readRhythm(notes(9, 0.6), 100)).toEqual({ bpm: 100, verdict: 'on', needle: 0, stable: 4 })
  })

  test('croches ou doubles au même tempo : toujours 100 (ramené au temps)', () => {
    expect(readRhythm(notes(9, 0.3), 100).bpm).toBe(100)
    expect(readRhythm(notes(9, 0.15), 100).bpm).toBe(100)
  })

  test('trop vite : presse ; trop lent : traîne ; aiguille bornée', () => {
    const fast = readRhythm(notes(9, 60 / 110), 100)
    expect(fast).toMatchObject({ bpm: 110, verdict: 'rush' })
    expect(fast.needle).toBeCloseTo(10 / 15)
    expect(readRhythm(notes(9, 60 / 92), 100)).toMatchObject({ bpm: 92, verdict: 'drag' })
    expect(readRhythm(notes(9, 60 / 140), 120).needle).toBe(1)
  })

  test('±5 bpm compte comme dans le temps', () => {
    expect(readRhythm(notes(9, 60 / 105), 100).verdict).toBe('on')
    expect(readRhythm(notes(9, 60 / 95), 100).verdict).toBe('on')
  })

  test('rebonds (< 80 ms) et silences (> 2,5 temps) ignorés ; trop peu d’attaques : rien', () => {
    expect(beatPeriods([1, 1.03, 1.6, 2.2, 5, 5.6], 100)).toHaveLength(3)
    expect(readRhythm([1, 1.6], 100)).toMatchObject({ bpm: null, verdict: null })
  })

  test('stabilité : 4 barres si régulier, moins si ça flotte', () => {
    expect(stabilityBars([0.6, 0.6, 0.6, 0.6])).toBe(4)
    expect(stabilityBars([0.6, 0.66, 0.55, 0.64, 0.57])).toBeLessThan(4)
    expect(stabilityBars([0.6, 0.9, 0.4, 0.8])).toBe(1)
  })

  test('régularité de la séance : part des lectures dans le temps', () => {
    expect(consistency(['on', 'on', 'rush', 'on'])).toBe(75)
    expect(consistency([])).toBeNull()
  })
})
