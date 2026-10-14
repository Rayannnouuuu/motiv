import { SONG_CATALOG, normTitle, type CatalogSong } from '../content/songCatalog'
import type { Song } from './types'

/** Morceaux du catalogue pas encore dans ta liste, du plus facile au plus dur. */
export function catalogNotAdded(songs: Song[]): CatalogSong[] {
  const mine = new Set(songs.map((s) => normTitle(s.title)))
  return SONG_CATALOG.filter((c) => !mine.has(normTitle(c.title))).sort((a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title))
}
