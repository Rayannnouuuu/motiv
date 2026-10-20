import { daysBetween } from './date'
import type { Day } from './types'
import type { Session, Song, SongStatus } from './model'

export const SONG_STATUS_LABELS: Record<SongStatus, string> = {
  to_learn: 'À apprendre',
  learning: 'En cours',
  maintain: 'À entretenir',
  mastered: 'Maîtrisé',
}

/** Un morceau à entretenir revient après 14 jours sans être joué. */
export const MAINTAIN_DAYS = 14

/** Dernier jour où chaque morceau a été joué. */
export function lastPlayed(sessions: Session[]): Map<string, Day> {
  const last = new Map<string, Day>()
  for (const s of sessions) for (const b of s.blocks) for (const e of b.entries) if (e.songId && (last.get(e.songId) ?? '') < s.day) last.set(e.songId, s.day)
  return last
}

/**
 * Morceaux « à entretenir » pas joués depuis 14 jours (jamais joués : depuis qu'ils sont maîtrisés), le plus
 * oublié d'abord. `since` : jours depuis la dernière fois, null si on ne sait pas.
 */
export function songsToMaintain(songs: Song[], sessions: Session[], today: Day): { song: Song; since: number | null }[] {
  const last = lastPlayed(sessions)
  return songs
    .filter((s) => s.status === 'maintain')
    .map((song) => {
      const ref = last.get(song.id) ?? song.masteredOn
      return { song, since: ref ? daysBetween(ref, today) : null }
    })
    .filter((x) => x.since === null || x.since >= MAINTAIN_DAYS)
    .sort((a, b) => (b.since ?? Infinity) - (a.since ?? Infinity) || a.song.title.localeCompare(b.song.title, 'fr'))
}
