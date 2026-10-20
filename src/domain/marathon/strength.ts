/**
 * Renfo coureur (lot 3) : pendant la préparation, la musculation sert la course. Charges entretenues, pas de
 * prise de masse. Version salle ou maison.
 */

/** Id du modèle de séance « Renfo coureur » : hors de la rotation Push / Pull / Legs. */
export const RUNNER_TEMPLATE_ID = 'renfo-coureur'

export interface RunnerMove {
  /** Mouvement de la bibliothèque sport. */
  movementId: string
  name: string
  sets: number
  reps: number
}

const GYM: RunnerMove[] = [
  { movementId: 'fentes', name: 'Fentes', sets: 3, reps: 10 },
  { movementId: 'montees-sur-banc', name: 'Montées sur banc', sets: 3, reps: 10 },
  { movementId: 'souleve-de-terre-roumain', name: 'Soulevé de terre roumain', sets: 3, reps: 8 },
  { movementId: 'mollets-debout', name: 'Mollets debout', sets: 3, reps: 15 },
  { movementId: 'abduction-hanche', name: 'Abduction de hanche', sets: 3, reps: 15 },
  { movementId: 'dead-bug', name: 'Dead bug', sets: 3, reps: 10 },
  { movementId: 'sauts-pieds-joints', name: 'Sauts pieds joints', sets: 3, reps: 8 },
]

const HOME: RunnerMove[] = [
  { movementId: 'fentes', name: 'Fentes', sets: 3, reps: 12 },
  { movementId: 'montees-sur-banc', name: 'Montées sur banc', sets: 3, reps: 12 },
  { movementId: 'sdt-unijambe', name: 'Soulevé de terre unijambe', sets: 3, reps: 10 },
  { movementId: 'mollets-une-jambe', name: 'Mollets sur une jambe', sets: 3, reps: 15 },
  { movementId: 'gainage-lateral-jambe', name: 'Gainage latéral, élévation de jambe', sets: 3, reps: 12 },
  { movementId: 'dead-bug', name: 'Dead bug', sets: 3, reps: 10 },
  { movementId: 'sauts-pieds-joints', name: 'Sauts pieds joints', sets: 3, reps: 8 },
]

export const runnerMoves = (gym: boolean) => (gym ? GYM : HOME)
export const runnerTemplateName = (gym: boolean) => `Renfo coureur (${gym ? 'salle' : 'maison'})`

export const STRENGTH_PURPOSE = 'Pendant la préparation, la musculation sert la course : charges entretenues, pas de recherche de prise de masse.'
