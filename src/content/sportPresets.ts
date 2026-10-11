import type { Program } from '../domain/types'

export interface PresetExercise {
  name: string
  sets: number
  reps: number
}

export interface SportPreset {
  id: string
  name: string
  description: string
  sessions: { name: string; exercises: PresetExercise[] }[]
}

const ex = (name: string, sets: number, reps: number): PresetExercise => ({ name, sets, reps })

export const SPORT_PRESETS: SportPreset[] = [
  {
    id: 'upper-lower',
    name: 'Haut / Bas',
    description: 'Deux séances en alternance : haut du corps, puis jambes.',
    sessions: [
      {
        name: 'Haut',
        exercises: [
          ex('Développé couché', 4, 8),
          ex('Rowing barre', 4, 8),
          ex('Développé militaire', 3, 10),
          ex('Tractions', 3, 8),
          ex('Curl biceps', 3, 12),
          ex('Extension triceps poulie', 3, 12),
        ],
      },
      {
        name: 'Bas',
        exercises: [
          ex('Squat', 4, 8),
          ex('Soulevé de terre roumain', 3, 10),
          ex('Presse à cuisses', 3, 12),
          ex('Fentes marchées', 3, 10),
          ex('Leg curl', 3, 12),
          ex('Mollets debout', 4, 15),
        ],
      },
    ],
  },
  {
    id: 'push-pull-legs',
    name: 'Push / Pull / Legs',
    description: 'Trois séances : pousser, tirer, jambes.',
    sessions: [
      {
        name: 'Push',
        exercises: [
          ex('Développé couché', 4, 8),
          ex('Développé incliné haltères', 3, 10),
          ex('Développé militaire', 3, 10),
          ex('Élévations latérales', 3, 15),
          ex('Dips', 3, 10),
          ex('Extension triceps poulie', 3, 12),
        ],
      },
      {
        name: 'Pull',
        exercises: [
          ex('Tractions', 4, 8),
          ex('Rowing barre', 4, 8),
          ex('Tirage horizontal', 3, 10),
          ex('Face pull', 3, 15),
          ex('Curl biceps', 3, 12),
          ex('Curl marteau', 3, 12),
        ],
      },
      {
        name: 'Legs',
        exercises: [
          ex('Squat', 4, 8),
          ex('Soulevé de terre roumain', 3, 10),
          ex('Presse à cuisses', 3, 12),
          ex('Leg curl', 3, 12),
          ex('Leg extension', 3, 12),
          ex('Mollets debout', 4, 15),
        ],
      },
    ],
  },
]

/** Transforme un programme tout fait en séances à enregistrer, placées après `startPosition`. */
export function presetToPrograms(preset: SportPreset, startPosition: number, newId: () => string): Program[] {
  return preset.sessions.map((s, i) => {
    const id = newId()
    return {
      id,
      name: s.name,
      position: startPosition + i,
      archived: false,
      exercises: s.exercises.map((e, j) => ({
        id: newId(),
        programId: id,
        name: e.name,
        targetSets: e.sets,
        targetReps: e.reps,
        position: j,
        archived: false,
      })),
    }
  })
}
