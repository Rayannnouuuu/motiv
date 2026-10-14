import { expect, test } from 'vitest'
import { SONG_CATALOG, catalogSong } from '../content/songCatalog'
import { mkSong } from '../test/factories'
import { catalogNotAdded } from './songSuggestion'

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
