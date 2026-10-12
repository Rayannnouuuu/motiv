import { expect, test } from 'vitest'
import { SONG_CATALOG, catalogSong } from '../content/songCatalog'
import { mkSong } from '../test/factories'
import { catalogNotAdded, songOfTheDay } from './songSuggestion'

test('catalogue : titres uniques, recherche tolérante', () => {
  expect(new Set(SONG_CATALOG.map((c) => c.title)).size).toBe(SONG_CATALOG.length)
  expect(catalogSong('chop suey')?.artist).toBe('System of a Down')
  expect(catalogSong('Inconnu')).toBeUndefined()
})

test('catalogNotAdded exclut tes morceaux, trie par difficulté', () => {
  const left = catalogNotAdded([mkSong({ title: 'paranoid' })])
  expect(left.some((c) => c.title === 'Paranoid')).toBe(false)
  expect(left[0].title).toBe('Seven Nation Army')
  expect(left.map((c) => c.difficulty)).toEqual([...left.map((c) => c.difficulty)].sort((a, b) => a - b))
})

test('songOfTheDay : facile, stable sur la journée, varie selon les jours', () => {
  const pick = songOfTheDay([], '2026-10-15')!
  expect(pick.difficulty).toBeLessThanOrEqual(2)
  expect(songOfTheDay([], '2026-10-15')).toEqual(pick)
  const days = ['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20']
  expect(new Set(days.map((d) => songOfTheDay([], d)!.title)).size).toBeGreaterThan(1)
  expect(songOfTheDay(SONG_CATALOG.map((c) => mkSong({ title: c.title })), '2026-10-15')).toBeNull()
})
