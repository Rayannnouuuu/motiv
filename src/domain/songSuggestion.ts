import { SONG_CATALOG, normTitle, type CatalogSong } from '../content/songCatalog'
import type { Day, Song } from './types'

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Morceaux du catalogue pas encore dans ta liste, du plus facile au plus dur. */
export function catalogNotAdded(songs: Song[]): CatalogSong[] {
  const mine = new Set(songs.map((s) => normTitle(s.title)))
  return SONG_CATALOG.filter((c) => !mine.has(normTitle(c.title))).sort((a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title))
}

/**
 * Morceau suggéré du jour : parmi les plus faciles pas encore ajoutés (difficulté minimale + 1),
 * un choix qui change chaque jour.
 */
export function songOfTheDay(songs: Song[], today: Day): CatalogSong | null {
  const left = catalogNotAdded(songs)
  if (left.length === 0) return null
  const pool = left.filter((c) => c.difficulty <= left[0].difficulty + 1)
  return pool[hash(today) % pool.length]
}
