import type {
  AppData,
  BodyMetric,
  Challenge,
  ChallengeTarget,
  GuitarItem,
  GuitarSession,
  Program,
  ProgramExercise,
  Rating,
  Song,
  SportSession,
} from '../domain/types'

// Lignes Supabase (snake_case). user_id est rempli par défaut côté base (auth.uid()).
export interface SongRow { id: string; title: string; status: Song['status']; mastered_on: string | null }
export interface GuitarSessionRow { id: string; day: string; duration_min: number; flow_rating: number; desire_rating: number; xp: number; created_at: string }
export interface GuitarItemRow { id: string; session_id: string; exercise_id: string | null; song_id: string | null; max_bpm: number | null; marked_mastered: boolean }
export interface ProgramRow { id: string; name: string; position: number; archived: boolean }
export interface ProgramExerciseRow { id: string; program_id: string; name: string; target_sets: number; target_reps: number; position: number; archived: boolean }
export interface SportSessionRow { id: string; day: string; program_id: string; duration_min: number; flow_rating: number; desire_rating: number; xp: number; created_at: string }
export interface SportSetRow { id: string; session_id: string; program_exercise_id: string; set_index: number; reps: number; weight_kg: number }
export interface BodyMetricRow { id: string; day: string; weight_kg: number | null; waist_cm: number | null; chest_cm: number | null; arm_cm: number | null; thigh_cm: number | null }
export interface ChallengeRow {
  id: string; domain: Challenge['domain']; level: number; kind: ChallengeTarget['kind']; target: Record<string, unknown>
  easier: boolean; status: Challenge['status']; created_on: string; blocked_since: string | null; done_on: string | null; rerolls: number
}

export interface Rows {
  songs: SongRow[]
  guitar_sessions: GuitarSessionRow[]
  guitar_session_items: GuitarItemRow[]
  sport_programs: ProgramRow[]
  program_exercises: ProgramExerciseRow[]
  sport_sessions: SportSessionRow[]
  sport_sets: SportSetRow[]
  body_metrics: BodyMetricRow[]
  challenges: ChallengeRow[]
}

export const TABLES = [
  'songs',
  'guitar_sessions',
  'guitar_session_items',
  'sport_programs',
  'program_exercises',
  'sport_sessions',
  'sport_sets',
  'body_metrics',
  'challenges',
] as const satisfies readonly (keyof Rows)[]

/**
 * Id stable d'une ligne enfant (item, série) : préfixe de l'id parent + index.
 * Un renvoi depuis la file hors-ligne produit les mêmes ids, donc l'upsert ne crée pas de doublon.
 */
export function childId(parentId: string, index: number): string {
  return parentId.slice(0, 24) + (index + 1).toString(16).padStart(12, '0')
}

const num = (v: number | string | null): number | null => (v === null ? null : Number(v))

export function songToRow(s: Song): SongRow {
  return { id: s.id, title: s.title, status: s.status, mastered_on: s.masteredOn }
}

export function guitarSessionToRows(s: GuitarSession): { session: GuitarSessionRow; items: GuitarItemRow[] } {
  return {
    session: { id: s.id, day: s.day, duration_min: s.durationMin, flow_rating: s.flowRating, desire_rating: s.desireRating, xp: s.xp, created_at: s.createdAt },
    items: s.items.map((it, i) => ({
      id: childId(s.id, i),
      session_id: s.id,
      exercise_id: it.kind === 'exercise' ? it.exerciseId : null,
      song_id: it.kind === 'song' ? it.songId : null,
      max_bpm: it.kind === 'exercise' ? it.maxBpm : null,
      marked_mastered: it.kind === 'song' && it.markedMastered,
    })),
  }
}

export function sportSessionToRows(s: SportSession): { session: SportSessionRow; sets: SportSetRow[] } {
  return {
    session: { id: s.id, day: s.day, program_id: s.programId, duration_min: s.durationMin, flow_rating: s.flowRating, desire_rating: s.desireRating, xp: s.xp, created_at: s.createdAt },
    sets: s.sets.map((x, i) => ({
      id: childId(s.id, i),
      session_id: s.id,
      program_exercise_id: x.programExerciseId,
      set_index: x.setIndex,
      reps: x.reps,
      weight_kg: x.weightKg,
    })),
  }
}

export function programToRows(p: Program): { program: ProgramRow; exercises: ProgramExerciseRow[] } {
  return {
    program: { id: p.id, name: p.name, position: p.position, archived: p.archived },
    exercises: p.exercises.map((e) => ({
      id: e.id,
      program_id: p.id,
      name: e.name,
      target_sets: e.targetSets,
      target_reps: e.targetReps,
      position: e.position,
      archived: e.archived,
    })),
  }
}

export function bodyMetricToRow(m: BodyMetric): BodyMetricRow {
  return { id: m.id, day: m.day, weight_kg: m.weightKg, waist_cm: m.waistCm, chest_cm: m.chestCm, arm_cm: m.armCm, thigh_cm: m.thighCm }
}

export function challengeToRow(c: Challenge): ChallengeRow {
  const { kind, ...target } = c.target
  return {
    id: c.id,
    domain: c.domain,
    level: c.level,
    kind,
    target,
    easier: c.easier,
    status: c.status,
    created_on: c.createdOn,
    blocked_since: c.blockedSince,
    done_on: c.doneOn,
    rerolls: c.rerolls,
  }
}

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const r of rows) m.set(key(r), [...(m.get(key(r)) ?? []), r])
  return m
}

const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)

export function toAppData(rows: Rows): AppData {
  const items = groupBy(rows.guitar_session_items, (r) => r.session_id)
  const sets = groupBy(rows.sport_sets, (r) => r.session_id)
  const exercises = groupBy(rows.program_exercises, (r) => r.program_id)

  return {
    songs: rows.songs.map((r) => ({ id: r.id, title: r.title, status: r.status, masteredOn: r.mastered_on })),
    guitarSessions: rows.guitar_sessions.map((r) => ({
      id: r.id,
      day: r.day,
      durationMin: r.duration_min,
      flowRating: r.flow_rating as Rating,
      desireRating: r.desire_rating as Rating,
      xp: r.xp,
      createdAt: r.created_at,
      items: [...(items.get(r.id) ?? [])].sort(byId).map(
        (it): GuitarItem =>
          it.exercise_id !== null
            ? { kind: 'exercise', exerciseId: it.exercise_id, maxBpm: it.max_bpm }
            : { kind: 'song', songId: it.song_id!, markedMastered: it.marked_mastered },
      ),
    })),
    sportSessions: rows.sport_sessions.map((r) => ({
      id: r.id,
      day: r.day,
      programId: r.program_id,
      durationMin: r.duration_min,
      flowRating: r.flow_rating as Rating,
      desireRating: r.desire_rating as Rating,
      xp: r.xp,
      createdAt: r.created_at,
      sets: [...(sets.get(r.id) ?? [])].sort(byId).map((x) => ({
        programExerciseId: x.program_exercise_id,
        setIndex: x.set_index,
        reps: x.reps,
        weightKg: Number(x.weight_kg),
      })),
    })),
    programs: rows.sport_programs.map((r) => ({
      id: r.id,
      name: r.name,
      position: r.position,
      archived: r.archived,
      exercises: [...(exercises.get(r.id) ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((e): ProgramExercise => ({
          id: e.id,
          programId: e.program_id,
          name: e.name,
          targetSets: e.target_sets,
          targetReps: e.target_reps,
          position: e.position,
          archived: e.archived,
        })),
    })),
    bodyMetrics: rows.body_metrics.map((r) => ({
      id: r.id,
      day: r.day,
      weightKg: num(r.weight_kg),
      waistCm: num(r.waist_cm),
      chestCm: num(r.chest_cm),
      armCm: num(r.arm_cm),
      thighCm: num(r.thigh_cm),
    })),
    challenges: rows.challenges.map((r) => ({
      id: r.id,
      domain: r.domain,
      level: r.level,
      target: { kind: r.kind, ...r.target } as ChallengeTarget,
      easier: r.easier,
      status: r.status,
      createdOn: r.created_on,
      blockedSince: r.blocked_since,
      doneOn: r.done_on,
      rerolls: r.rerolls,
    })),
  }
}
