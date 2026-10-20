import { expect, test } from 'vitest'
import type { Session, Song } from './model'
import { songsToMaintain } from './repertoire'

const song = (id: string, status: Song['status'], masteredOn: string | null = '2026-09-01'): Song => ({ id, title: id, artist: '', status, masteredOn })
const played = (day: string, songId: string): Session => ({
  id: `g-${day}-${songId}`,
  discipline: 'guitar',
  day,
  createdAt: `${day}T18:00:00Z`,
  durationMin: 30,
  isLight: false,
  flowScore: 3,
  desireScore: 3,
  blocks: [{ type: 'repertoire', entries: [{ songId, sets: [] }] }],
  xp: 0,
})

test('à entretenir : revient après 14 jours sans être joué, le plus oublié d’abord', () => {
  const songs = [song('a', 'maintain'), song('b', 'maintain'), song('c', 'maintain'), song('d', 'mastered'), song('e', 'maintain', null)]
  const sessions = [played('2026-10-10', 'a'), played('2026-10-01', 'b'), played('2026-09-20', 'b'), played('2026-09-01', 'd')]
  // a : joué il y a 5 j → pas encore ; b : 14 j → oui ; c : jamais joué, maîtrisé le 1er sept. → 44 j ;
  // d : maîtrisé, pas à entretenir ; e : ni joué ni date → toujours proposé, en premier.
  expect(songsToMaintain(songs, sessions, '2026-10-15').map((x) => [x.song.id, x.since])).toEqual([
    ['e', null],
    ['c', 44],
    ['b', 14],
  ])
})
