import { SONG_CATALOG, normTitle, type CatalogSong } from '../content/songCatalog'
import type { Day, GuitarSession, Song } from './types'

/** Morceaux du catalogue pas encore dans ta liste, du plus facile au plus dur. */
export function catalogNotAdded(songs: Song[]): CatalogSong[] {
  const mine = new Set(songs.map((s) => normTitle(s.title)))
  return SONG_CATALOG.filter((c) => !mine.has(normTitle(c.title))).sort((a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title))
}

/** Tes morceaux : joués au moins une fois dans un log guitare, ou maîtrisés. Un morceau seulement ajouté n'en est pas. */
export function activeSongs(songs: Song[], sessions: GuitarSession[]): Song[] {
  const played = new Set(sessions.flatMap((s) => s.items.flatMap((it) => (it.kind === 'song' ? [it.songId] : []))))
  return songs.filter((s) => s.status === 'mastered' || played.has(s.id))
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** À jouer aujourd'hui : un de tes morceaux en cours et un nouveau parmi les plus faciles, qui changent chaque jour. */
export function songsOfTheDay(songs: Song[], sessions: GuitarSession[], today: Day): string[] {
  const active = activeSongs(songs, sessions)
  const learning = active.filter((s) => s.status === 'learning').sort((a, b) => a.title.localeCompare(b.title))
  const left = catalogNotAdded(active)
  const easy = left.filter((c) => c.difficulty <= (left[0]?.difficulty ?? 0) + 1)
  const pick = <T,>(list: T[], salt: string) => (list.length > 0 ? [list[hash(today + salt) % list.length]] : [])
  return [...pick(learning, 'cours').map((s) => s.title), ...pick(easy, 'neuf').map((c) => c.title)]
}
