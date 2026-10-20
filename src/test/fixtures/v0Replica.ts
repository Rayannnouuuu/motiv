/**
 * Réplique factice des vraies données au format 0 (même forme, valeurs inventées) : la vraie copie reste
 * hors du dépôt. 6 séances guitare, 1 séance sport de 19 séries, 45 morceaux jamais joués, 3 programmes
 * actifs + 3 archivés quasi identiques, 1 mesure avec 183 en tour de taille, 4 défis.
 */
import type { BackupV0 } from '../../data/migrations/v0ToV1'
import { SONG_CATALOG } from '../../content/songCatalog'
import type { AppData, Program } from '../../domain/types'

const PPL: [string, [string, number, number][]][] = [
  ['Push', [['Développé couché', 4, 8], ['Développé incliné', 3, 10], ['Développé militaire', 3, 10], ['Extension triceps poulie', 3, 12], ['Dips', 3, 10], ['Élévations latérales', 3, 15]]],
  ['Pull', [['Tractions', 4, 8], ['Rowing barre', 4, 8], ['Tirage horizontal', 3, 10], ['Face pull', 3, 15], ['Curl biceps', 3, 12], ['Curl marteau', 3, 12]]],
  ['Legs', [['Squat', 4, 8], ['Soulevé de terre roumain', 3, 10], ['Presse à cuisses', 3, 12], ['Leg curl', 3, 12], ['Leg extension', 3, 12], ['Mollets debout', 4, 15]]],
]

function programs(): Program[] {
  return PPL.flatMap(([name, exos], i) =>
    [true, false].map((archived) => {
      const id = `prog-${archived ? 'a' : 'b'}${i}`
      return {
        id,
        name,
        position: archived ? i : i + 3,
        archived,
        exercises: exos.map(([exo, targetSets, targetReps], position) => ({
          id: `${id}-pe${position}`,
          programId: id,
          // L'ancien Push archivé disait « haltères » : même mouvement que « Développé incliné » pour la bibliothèque.
          name: archived && exo === 'Développé incliné' ? 'Développé incliné haltères' : exo,
          targetSets,
          targetReps,
          position,
          archived: false,
        })),
      }
    }),
  )
}

const g = (id: string, day: string, createdAt: string, durationMin: number, xp: number, exerciseId: string, maxBpm: number | null, flow: 1 | 2 | 3, desire: 1 | 2 | 3 | 4) => ({
  id,
  day,
  durationMin,
  flowRating: flow,
  desireRating: desire,
  xp,
  createdAt,
  items: [{ kind: 'exercise' as const, exerciseId, maxBpm }],
})

export function v0Replica(): BackupV0 {
  const push = 'prog-b0'
  const sets: [number, number, number][] = [
    [0, 8, 60], [0, 8, 80], [0, 8, 80], [0, 8, 80],
    [1, 10, 40], [1, 10, 40], [1, 10, 40],
    [2, 9, 18], [2, 7, 18], [2, 7, 18],
    [3, 15, 18], [3, 12, 18], [3, 10, 18],
    [4, 10, 41], [4, 9, 41], [4, 7, 41],
    [5, 14, 5], [5, 12, 5], [5, 12, 5],
  ]
  const index = new Map<number, number>()
  const data: AppData = {
    guitarSessions: [
      g('g-1', '2026-10-12', '2026-10-12T16:02:53.516+00:00', 15, 15, 'scales-1', 40, 1, 2),
      g('g-2', '2026-10-12', '2026-10-12T18:21:50.802+00:00', 30, 30, 'scales-1', 40, 3, 3),
      g('g-3', '2026-10-12', '2026-10-12T20:07:02.675+00:00', 15, 25, 'scales-1', 55, 3, 2),
      g('g-4', '2026-10-13', '2026-10-13T01:36:04.723+00:00', 15, 15, 'rhythm-1', 66, 3, 4),
      g('g-5', '2026-10-13', '2026-10-13T20:46:56.862+00:00', 15, 15, 'picking-1', null, 2, 1),
      { ...g('g-6', '2026-10-14', '2026-10-15T15:41:25.763+00:00', 15, 15, 'scales-1', null, 3, 3), items: [] },
    ],
    songs: SONG_CATALOG.map((c, i) => ({ id: `song-${String(i).padStart(2, '0')}`, title: c.title, status: 'learning' as const, masteredOn: null })),
    sportSessions: [
      {
        id: 's-1',
        day: '2026-10-13',
        programId: push,
        durationMin: 69,
        flowRating: 3,
        desireRating: 3,
        xp: 60,
        createdAt: '2026-10-13T17:57:25.09+00:00',
        sets: sets.map(([pe, reps, weightKg]) => {
          const setIndex = (index.get(pe) ?? 0) + 1
          index.set(pe, setIndex)
          return { programExerciseId: `${push}-pe${pe}`, setIndex, reps, weightKg }
        }),
      },
    ],
    programs: programs(),
    bodyMetrics: [{ id: 'm-1', day: '2026-10-13', weightKg: 108.9, waistCm: 183, chestCm: null, armCm: null, thighCm: null }],
    challenges: [
      { id: 'c-1', domain: 'guitar', level: 1, target: { kind: 'bpm', exerciseId: 'scales-1', bpm: 66, baseline: null }, easier: false, status: 'replaced', createdOn: '2026-10-12', blockedSince: null, doneOn: null, rerolls: 0 },
      { id: 'c-2', domain: 'guitar', level: 1, target: { kind: 'bpm', exerciseId: 'scales-3', bpm: 78, baseline: null }, easier: false, status: 'active', createdOn: '2026-10-12', blockedSince: null, doneOn: null, rerolls: 0 },
      { id: 'c-3', domain: 'sport', level: 1, target: { kind: 'sessionsInWeek', count: 4 }, easier: false, status: 'active', createdOn: '2026-10-12', blockedSince: null, doneOn: null, rerolls: 0 },
      { id: 'c-4', domain: 'sport', level: 1, target: { kind: 'weight', programExerciseId: `${push}-pe0`, reps: 8, weightKg: 82.5, baseline: 80 }, easier: false, status: 'replaced', createdOn: '2026-10-12', blockedSince: null, doneOn: null, rerolls: 1 },
    ],
  }
  return { app: 'motiv', schemaVersion: 0, exportedAt: '2026-10-19T19:00:00.000Z', data }
}
