import { describe, expect, test } from 'vitest'
import { getSkill } from '../../content/guitar'
import type { Song } from '../model'
import { diagnose, EMPTY_PROGRESS, learning, recordAttempt, startSkill } from './engine'
import { DURATIONS, ensureLearning, generateSession, objectiveOf, weekFocus } from './session'

const today = '2026-11-02'
const song = (id: string, title: string, status: Song['status'] = 'learning'): Song => ({ id, title, artist: 'x', status, masteredOn: null })

describe('séance guidée', () => {
  const progress = ensureLearning(EMPTY_PROGRESS, today)
  test('3 compétences à jouer démarrées d’office : jamais l’accordage, le son clair ni la posture', () => {
    expect(
      learning(progress)
        .map((l) => l.skillId)
        .sort(),
    ).toEqual(['chromatic-quarter', 'downstrokes', 'reading'])
    expect(learning(ensureLearning(progress, today))).toHaveLength(3)
  })

  test('minutes par bloc selon la durée (§5)', () => {
    const mins = (d: (typeof DURATIONS)[number]) => generateSession({ duration: d, progress, today, songs: [] }).blocks.map((b) => [b.kind, b.minutes])
    expect(mins(15)).toEqual([
      ['warmup', 2],
      ['focus', 6],
      ['maintenance', 2],
      ['repertoire', 5],
    ])
    expect(mins(30)).toEqual([
      ['warmup', 4],
      ['focus', 10],
      ['maintenance', 5],
      ['repertoire', 8],
      ['bonus', 3],
    ])
    expect(mins(60).map(([, m]) => m)).toEqual([6, 20, 10, 16, 8])
  })

  test('focus et entretien sur des compétences qui se jouent (exercice, métronome) avant un quiz saisi à la main', () => {
    const plan = generateSession({ duration: 30, progress, today, songs: [] })
    const [, focus, maint] = plan.blocks
    expect(focus.skillId).toBe('chromatic-quarter')
    expect(maint.skillId).toBe('downstrokes')
  })

  test('morceau : en cours d’abord ; sinon un morceau à apprendre ; les maîtrisés jamais seuls', () => {
    const pick = (songs: Song[]) => generateSession({ duration: 30, progress, today, songs }).blocks.find((b) => b.kind === 'repertoire')!
    expect(pick([song('a', 'Zed'), song('b', 'Alpha', 'to_learn')]).songId).toBe('a')
    expect(pick([song('b', 'Alpha', 'to_learn'), song('c', 'Beta', 'to_learn')]).songId).toBeDefined()
    expect(pick([song('m', 'Fini', 'mastered')]).songId).toBeUndefined()
    expect(pick([])).toMatchObject({ title: 'Un morceau de ta liste' })
  })

  test('échauffement : chromatique à 80 % du record propre ; focus et entretien sur des compétences différentes', () => {
    let p = startSkill(EMPTY_PROGRESS, 'chromatic-quarter', today)
    p = recordAttempt(p, 'chromatic-quarter', { day: today, value: 60, clean: true })
    p = ensureLearning(p, today)
    const plan = generateSession({ duration: 30, progress: p, today, songs: [song('s', 'Paranoid')] })
    expect(plan.blocks[0]).toMatchObject({ exerciseId: 'chromatic-1', bpm: 48 })
    const [, focus, maint, rep] = plan.blocks
    expect(focus.skillId).not.toBe(maint.skillId)
    expect(rep).toMatchObject({ songId: 's', title: 'Paranoid' })
  })

  test('entretien dû : prioritaire sur une autre compétence en cours', () => {
    const p = ensureLearning(diagnose(EMPTY_PROGRESS, ['reading'], today), today)
    const plan = generateSession({ duration: 30, progress: p, today: '2026-11-05', songs: [] })
    expect(plan.blocks[2]).toMatchObject({ kind: 'maintenance', skillId: 'reading', review: true })
  })

  test('focus de la semaine : celui choisi tant que la semaine est la même, sinon une compétence jouable en cours', () => {
    const first = 'chromatic-quarter'
    const chosen = 'reading'
    expect(weekFocus(progress, { week: '2026-11-02', skillId: chosen }, '2026-11-06')).toBe(chosen)
    expect(weekFocus(progress, { week: '2026-10-26', skillId: chosen }, '2026-11-06')).toBe(first)
    expect(weekFocus(EMPTY_PROGRESS, undefined, today)).toBeNull()
  })

  test('un seul objectif chiffré sur la compétence focus', () => {
    expect(objectiveOf(getSkill('chromatic-quarter')!, EMPTY_PROGRESS).text).toBe('Chromatique 1-2-3-4 sur une corde : à 60 bpm, propre')
    expect(objectiveOf(getSkill('changes')!, EMPTY_PROGRESS)).toMatchObject({ target: 15 })
    let p = startSkill(diagnose(EMPTY_PROGRESS, ['chromatic-quarter', 'reading'], today), 'open-chords', today)
    p = diagnose(p, ['open-chords'], today)
    p = startSkill(p, 'changes', today)
    p = recordAttempt(p, 'changes', { day: today, value: 22 })
    expect(objectiveOf(getSkill('changes')!, p)).toMatchObject({
      text: 'Changements d’accords, méthode « une minute » : passer de 22 à 25 changements',
      target: 25,
    })
    expect(objectiveOf(getSkill('notes-low')!, EMPTY_PROGRESS).text).toMatch(/90 %/)
  })
})
