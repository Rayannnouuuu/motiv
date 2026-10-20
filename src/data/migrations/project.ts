/**
 * Modèle v1 → ancienne forme (domain/types.ts), lue par les écrans et les règles du lot 1.
 * Réciproque exacte de v0ToV1 : un test vérifie que l'aller-retour rend les données d'origine.
 */
import type * as V1 from '../../domain/model'
import type { AppData, Challenge, GuitarItem, GuitarSession, Program, Song, SportSession } from '../../domain/types'

const entries = (s: V1.Session) => s.blocks.flatMap((b) => b.entries)

function guitarSession(s: V1.Session): GuitarSession {
  return {
    id: s.id,
    day: s.day,
    durationMin: s.durationMin,
    flowRating: s.flowScore,
    desireRating: s.desireScore,
    xp: s.xp,
    createdAt: s.createdAt,
    items: entries(s).map((e): GuitarItem =>
      e.songId !== undefined
        ? { kind: 'song', songId: e.songId, markedMastered: e.markedMastered === true }
        : { kind: 'exercise', exerciseId: e.exerciseId ?? '', maxBpm: e.sets[0]?.bpm ?? null },
    ),
  }
}

/** Le rang d'une série parmi celles du même exo dans la séance redonne son ancien numéro. */
function sportSession(s: V1.Session): SportSession {
  const count = new Map<string, number>()
  return {
    id: s.id,
    day: s.day,
    programId: s.templateId ?? '',
    durationMin: s.durationMin,
    flowRating: s.flowScore,
    desireRating: s.desireScore,
    xp: s.xp,
    createdAt: s.createdAt,
    sets: entries(s).flatMap((e) => {
      const programExerciseId = e.templateEntryId ?? e.exerciseId ?? ''
      return e.sets.map((x) => {
        const setIndex = (count.get(programExerciseId) ?? 0) + 1
        count.set(programExerciseId, setIndex)
        return { programExerciseId, setIndex, reps: x.reps ?? 0, weightKg: x.loadKg ?? 0 }
      })
    }),
  }
}

const song = (s: V1.Song): Song => ({
  id: s.id,
  title: s.title,
  status: s.status === 'mastered' || s.status === 'maintain' ? 'mastered' : 'learning',
  masteredOn: s.masteredOn,
})

const program = (t: V1.Template): Program => ({
  id: t.id,
  name: t.name,
  position: t.position,
  archived: t.archived,
  exercises: t.blocks.flatMap((b) => b.entries).map((e) => ({
    id: e.id,
    programId: t.id,
    name: e.name,
    targetSets: e.targetSets,
    targetReps: e.targetReps,
    position: e.position,
    archived: e.archived,
  })),
})

function challenge(c: V1.Challenge): Challenge {
  const t = c.target
  if (t.kind !== 'weight' && t.kind !== 'reps') return { ...c, target: t }
  const { exerciseId: _exerciseId, templateEntryId, ...rest } = t
  return { ...c, target: { ...rest, programExerciseId: templateEntryId } }
}

export function toAppData(d: Pick<V1.DataV1, 'sessions' | 'songs' | 'templates' | 'measurements' | 'challenges'>): AppData {
  return {
    guitarSessions: d.sessions.filter((s) => s.discipline === 'guitar').map(guitarSession),
    sportSessions: d.sessions.filter((s) => s.discipline === 'sport').map(sportSession),
    songs: d.songs.map(song),
    programs: d.templates.filter((t) => t.discipline === 'sport').map(program),
    bodyMetrics: d.measurements.map((m) => ({ ...m })),
    challenges: d.challenges.map(challenge),
  }
}
