import { beforeEach, describe, expect, test } from 'vitest'
import {
  elapsedMs,
  formatClock,
  isStale,
  loadPractice,
  logMinutes,
  practiceReducer,
  runningPracticeMinutes,
  savePractice,
  startPractice,
  type PracticeState,
} from './practiceSession'

const t0 = new Date('2026-10-15T18:00:00Z')
const at = (sec: number) => new Date(t0.getTime() + sec * 1000)

beforeEach(() => localStorage.clear())

describe('practiceReducer', () => {
  test('les pauses ne comptent pas ; une double pause ne change rien', () => {
    let s = startPractice(t0, 'p')
    expect(elapsedMs(s, at(90))).toBe(90_000)
    s = practiceReducer(s, { type: 'pause', at: at(100) })
    expect(elapsedMs(s, at(500))).toBe(100_000)
    s = practiceReducer(s, { type: 'pause', at: at(200) })
    expect(s.pausedAt).toBe(at(100).toISOString())
    s = practiceReducer(s, { type: 'resume', at: at(400) })
    expect(s).toMatchObject({ pausedAt: null, pausedMs: 300_000 })
    expect(elapsedMs(s, at(460))).toBe(160_000)
    // Reprendre sans pause : aucun effet.
    expect(practiceReducer(s, { type: 'resume', at: at(500) })).toBe(s)
  })

  test('cocher puis décocher un exo ou un morceau', () => {
    let s = startPractice(t0, 'p')
    s = practiceReducer(s, { type: 'toggleExercise', id: 'scales-1' })
    s = practiceReducer(s, { type: 'toggleExercise', id: 'legato-4' })
    s = practiceReducer(s, { type: 'toggleSong', id: 'song-1' })
    expect(s).toMatchObject({ exercises: ['scales-1', 'legato-4'], songs: ['song-1'] })
    s = practiceReducer(s, { type: 'toggleExercise', id: 'scales-1' })
    s = practiceReducer(s, { type: 'toggleSong', id: 'song-1' })
    expect(s).toMatchObject({ exercises: ['legato-4'], songs: [] })
  })

  test('célébration notée une fois', () => {
    const s = practiceReducer(startPractice(t0, 'p'), { type: 'celebrated' })
    expect(s.goalCelebrated).toBe(true)
    expect(practiceReducer(s, { type: 'celebrated' })).toBe(s)
  })
})

describe('minutes et affichage', () => {
  test('logMinutes : arrondi, au moins 1, au plus 600', () => {
    const s = startPractice(t0, 'p')
    expect(logMinutes(s, at(10))).toBe(1)
    expect(logMinutes(s, at(29 * 60 + 31))).toBe(30)
    expect(logMinutes(s, at(11 * 3600))).toBe(600)
  })

  test('formatClock', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(65_000)).toBe('1:05')
    expect(formatClock(59 * 60_000 + 59_999)).toBe('59:59')
    expect(formatClock(3_723_000)).toBe('1:02:03')
  })

  test('isStale : plus de 12 h depuis le début', () => {
    const s = startPractice(t0, 'p')
    expect(isStale(s, at(12 * 3600))).toBe(false)
    expect(isStale(s, at(12 * 3600 + 1))).toBe(true)
  })
})

describe('stockage', () => {
  test('aller-retour, puis effacement', () => {
    const s: PracticeState = { ...startPractice(t0, 'p'), exercises: ['scales-1'], pausedAt: at(30).toISOString(), pausedMs: 5000 }
    savePractice(s)
    expect(loadPractice()).toEqual(s)
    savePractice(null)
    expect(loadPractice()).toBeNull()
  })

  test('runningPracticeMinutes : minutes du chrono enregistré, null sans chrono ou après 12 h', () => {
    expect(runningPracticeMinutes(at(60))).toBeNull()
    savePractice(startPractice(t0, 'p'))
    expect(runningPracticeMinutes(at(12 * 60 + 10))).toBe(12)
    expect(runningPracticeMinutes(at(13 * 3600))).toBeNull()
  })

  test('JSON corrompu ou forme invalide → null', () => {
    localStorage.setItem('motiv.practice.v1', '{oops')
    expect(loadPractice()).toBeNull()
    localStorage.setItem('motiv.practice.v1', '{"id":3}')
    expect(loadPractice()).toBeNull()
    localStorage.setItem('motiv.practice.v1', JSON.stringify({ ...startPractice(t0, 'p'), startedAt: 'hier' }))
    expect(loadPractice()).toBeNull()
    localStorage.setItem('motiv.practice.v1', JSON.stringify({ ...startPractice(t0, 'p'), exercises: [1] }))
    expect(loadPractice()).toBeNull()
  })
})
