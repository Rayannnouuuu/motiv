import type {
  AppData,
  Challenge,
  ChallengeTarget,
  Day,
  GuitarItem,
  GuitarSession,
  Program,
  ProgramExercise,
  Song,
  SportSession,
  SportSet,
} from '../domain/types'
import { EMPTY_DATA } from '../domain/types'

let n = 0
const id = (p: string) => `${p}-${++n}`

export function g(day: Day, durationMin: number, items: GuitarItem[] = [], xp = durationMin): GuitarSession {
  return { id: id('gs'), day, durationMin, flowRating: 3, desireRating: 3, xp, createdAt: `${day}T12:00:00Z`, items }
}

export function gs(items: GuitarItem[], day: Day = '2026-10-01'): GuitarSession {
  return g(day, 30, items)
}

export function ex(exerciseId: string, maxBpm: number | null): GuitarItem {
  return { kind: 'exercise', exerciseId, maxBpm }
}

export function song(songId: string, markedMastered: boolean): GuitarItem {
  return { kind: 'song', songId, markedMastered }
}

export function mkSong(over: Partial<Song> = {}): Song {
  return { id: id('song'), title: 'Paranoid', status: 'learning', masteredOn: null, ...over }
}

export function set(weightKg: number, reps: number, programExerciseId = 'pe1', setIndex = 1): SportSet {
  return { programExerciseId, setIndex, reps, weightKg }
}

export function ss(sets: SportSet[], day: Day = '2026-10-01', programId = 'p1', xp = 60): SportSession {
  return { id: id('ss'), day, programId, durationMin: 50, flowRating: 3, desireRating: 3, xp, createdAt: `${day}T18:00:00Z`, sets }
}

export function pe(over: Partial<ProgramExercise> = {}): ProgramExercise {
  return { id: id('pe'), programId: 'p1', name: 'Développé couché', targetSets: 4, targetReps: 8, position: 0, archived: false, ...over }
}

export function program(over: Partial<Program> = {}): Program {
  return { id: id('p'), name: 'Haut', position: 0, archived: false, exercises: [], ...over }
}

export function challenge(over: Partial<Challenge> & { target?: ChallengeTarget } = {}): Challenge {
  return {
    id: id('c'),
    domain: 'guitar',
    level: 1,
    target: { kind: 'bpm', exerciseId: 'scales-1', bpm: 66, baseline: null },
    easier: false,
    status: 'active',
    createdOn: '2026-10-01',
    blockedSince: null,
    doneOn: null,
    rerolls: 0,
    ...over,
  }
}

export function data(over: Partial<AppData> = {}): AppData {
  return { ...EMPTY_DATA, ...over }
}
