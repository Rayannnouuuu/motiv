import { describe, expect, test } from 'vitest'
import type { Proof } from './model'
import { audioSubjects, comparePair, nextDue, proofsOf, subjectOf } from './proofs'

const audio = (id: string, day: string, songId?: string, exerciseId?: string): Proof => ({
  id,
  discipline: 'guitar',
  kind: 'audio',
  day,
  createdAt: `${day}T10:00:00Z`,
  mime: 'audio/mp4',
  ...(songId ? { songId } : {}),
  ...(exerciseId ? { exerciseId } : {}),
})
const photo = (id: string, day: string): Proof => ({ id, discipline: 'sport', kind: 'photo', day, createdAt: `${day}T10:00:00Z`, mime: 'image/jpeg' })

describe('preuves', () => {
  test('sujet : morceau, exo ou photo', () => {
    expect(subjectOf(audio('a', '2026-10-01', 's1'))).toBe('song:s1')
    expect(subjectOf(audio('a', '2026-10-01', undefined, 'legato-4'))).toBe('exercise:legato-4')
    expect(subjectOf(photo('p', '2026-10-01'))).toBe('photo')
  })

  test('comparaison : la plus récente et celle d’il y a au moins 30 jours, la plus proche', () => {
    const list = [
      audio('a', '2026-08-01', 's1'),
      audio('b', '2026-09-15', 's1'),
      audio('c', '2026-10-01', 's1'),
      audio('d', '2026-10-20', 's1'),
      audio('x', '2026-10-21', 's2'),
    ]
    expect(comparePair(list, 'song:s1')).toMatchObject({ then: { id: 'b' }, now: { id: 'd' }, days: 35 })
  })

  test('moins de 30 jours d’historique : la plus ancienne ; une seule : rien à comparer', () => {
    expect(comparePair([audio('a', '2026-10-10', 's1'), audio('b', '2026-10-20', 's1')], 'song:s1')).toMatchObject({ then: { id: 'a' }, days: 10 })
    expect(comparePair([photo('p', '2026-10-20')], 'photo')).toEqual({ then: null, now: expect.objectContaining({ id: 'p' }), days: null })
    expect(comparePair([], 'photo')).toEqual({ then: null, now: null, days: null })
  })

  test('sujets audio du plus récent au plus ancien ; prochaine preuve 30 jours après la dernière', () => {
    const list = [audio('a', '2026-09-01', 's1'), audio('b', '2026-10-01', undefined, 'legato-4'), photo('p', '2026-10-05')]
    expect(audioSubjects(list)).toEqual(['exercise:legato-4', 'song:s1'])
    expect(proofsOf(list, 'photo').map((p) => p.id)).toEqual(['p'])
    expect(nextDue(list, 'photo')).toBe('2026-11-04')
    expect(nextDue(list, 'song:s2')).toBeNull()
  })
})
