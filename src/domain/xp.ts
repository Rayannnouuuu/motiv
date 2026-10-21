import { CATEGORY_LABELS, getExercise, type Exercise } from '../content/exercises'
import { bestBpm, isSportRecord, maxDifficultyByCategory, setsForExercise } from './records'
import type { GuitarSession, Song, SportSession } from './types'

export interface XpLine {
  label: string
  xp: number
}

export interface XpResult {
  total: number
  lines: XpLine[]
}

/** Lot 4 : l'XP récompense la progression, pas le temps passé ni la séance faite. */
export const XP_TEMPO_RECORD = 20
export const XP_DIFFICULTY_UP = 50
export const XP_SONG_MASTERED = 100
export const XP_SPORT_RECORD = 20
export const XP_LONGEST_RUN = 20

const result = (lines: XpLine[]): XpResult => ({ total: lines.reduce((t, l) => t + l.xp, 0), lines })

export function guitarSessionXp(draft: Pick<GuitarSession, 'items'>, history: GuitarSession[], songs: Song[]): XpResult {
  const lines: XpLine[] = []

  // Exos connus du brouillon, dédoublonnés en gardant le plus grand tempo.
  const exercises = new Map<string, { ex: Exercise; maxBpm: number | null }>()
  for (const it of draft.items) {
    if (it.kind !== 'exercise') continue
    const e = getExercise(it.exerciseId)
    if (!e) continue
    const prev = exercises.get(e.id)
    const maxBpm = prev?.maxBpm == null ? it.maxBpm : it.maxBpm == null ? prev.maxBpm : Math.max(prev.maxBpm, it.maxBpm)
    exercises.set(e.id, { ex: e, maxBpm })
  }

  for (const { ex, maxBpm } of exercises.values()) {
    const best = bestBpm(history, ex.id)
    if (maxBpm !== null && best !== null && maxBpm > best) lines.push({ label: `Record de tempo · ${ex.title}`, xp: XP_TEMPO_RECORD })
  }

  const prevMax = maxDifficultyByCategory(history)
  const draftMax = new Map<Exercise['category'], number>()
  for (const { ex } of exercises.values()) draftMax.set(ex.category, Math.max(draftMax.get(ex.category) ?? 0, ex.difficulty))
  for (const [category, difficulty] of draftMax) {
    const before = prevMax[category]
    if (before !== undefined && difficulty > before) lines.push({ label: `Difficulté en hausse · ${CATEGORY_LABELS[category]}`, xp: XP_DIFFICULTY_UP })
  }

  for (const it of draft.items) {
    if (it.kind !== 'song' || !it.markedMastered) continue
    const s = songs.find((x) => x.id === it.songId)
    if (s?.status === 'mastered') continue
    lines.push({ label: `Morceau maîtrisé · ${s?.title ?? 'nouveau morceau'}`, xp: XP_SONG_MASTERED })
  }

  return result(lines)
}

export function sportSessionXp(
  draft: Pick<SportSession, 'sets'>,
  history: SportSession[],
  exerciseName: (programExerciseId: string) => string = () => 'exo',
): XpResult {
  const lines: XpLine[] = []
  const exerciseIds = [...new Set(draft.sets.map((s) => s.programExerciseId))]
  for (const id of exerciseIds) {
    const previous = setsForExercise(history, id)
    if (draft.sets.some((s) => s.programExerciseId === id && isSportRecord(previous, s)))
      lines.push({ label: `Record · ${exerciseName(id)}`, xp: XP_SPORT_RECORD })
  }
  return result(lines)
}

/** Sortie de course : plus longue sortie jamais faite. */
export function runXp(km: number, previousKm: number[]): XpResult {
  return result(
    previousKm.length > 0 && km > Math.max(...previousKm) ? [{ label: `Plus longue sortie · ${String(km).replace('.', ',')} km`, xp: XP_LONGEST_RUN }] : [],
  )
}
