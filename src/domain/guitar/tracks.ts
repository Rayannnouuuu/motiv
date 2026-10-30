/**
 * Parcours des accords (lot 18) : l'état de chaque étape (faite, en cours, verrouillée), le raccourci « je le sais déjà »
 * et la validation d'office des grosses étapes du parcours général. Pur : la progression est celle du moteur.
 */
import { getSkill, TRACK_SKILLS, type Skill } from '../../content/guitar'
import { CHORD_BLOCKS, PATH_COVERS } from '../../content/guitar/tracks'
import { addDays } from '../date'
import type { Day } from '../types'
import { diagnose, REVIEW_DAYS, startSkill, type GuitarProgress } from './engine'

export type StepState = 'done' | 'current' | 'locked'

export interface Step {
  skill: Skill
  state: StepState
}

export const trackSteps = (p: GuitarProgress): Step[] => {
  let currentSeen = false
  return TRACK_SKILLS.map((skill) => {
    if (p.skills[skill.id]?.status === 'validated') return { skill, state: 'done' as const }
    if (!currentSeen) {
      currentSeen = true
      return { skill, state: 'current' as const }
    }
    return { skill, state: 'locked' as const }
  })
}

export const currentStep = (p: GuitarProgress): Skill | null => trackSteps(p).find((s) => s.state === 'current')?.skill ?? null

export const trackDone = (p: GuitarProgress) => trackSteps(p).filter((s) => s.state === 'done').length

/** L'étape en cours est ouverte (état « en cours » du moteur) avant d'y noter un essai. */
export function openStep(p: GuitarProgress, skillId: string, today: Day): GuitarProgress {
  return p.skills[skillId] ? p : startSkill(p, skillId, today)
}

/** « Je le sais déjà » : valide cette étape et toutes celles d'avant, entretien prévu. */
export function knownUpTo(p: GuitarProgress, skillId: string, today: Day): GuitarProgress {
  const i = TRACK_SKILLS.findIndex((s) => s.id === skillId)
  if (i < 0) throw new Error(`Étape inconnue : ${skillId}`)
  const ids = TRACK_SKILLS.slice(0, i + 1)
    .filter((s) => p.skills[s.id]?.status !== 'validated')
    .map((s) => s.id)
  return syncPath(diagnose(p, ids, today), today)
}

/** Les grosses étapes du parcours général dont toutes les étapes couvrantes sont faites passent à « validée ». */
export function syncPath(p: GuitarProgress, today: Day): GuitarProgress {
  const skills = { ...p.skills }
  for (const [pathId, covers] of Object.entries(PATH_COVERS)) {
    if (skills[pathId]?.status === 'validated' || !getSkill(pathId)) continue
    if (!covers.every((id) => skills[id]?.status === 'validated')) continue
    skills[pathId] = {
      skillId: pathId,
      status: 'validated',
      fragile: false,
      startedAt: today,
      validatedAt: today,
      attempts: [],
      review: { dueAt: addDays(today, REVIEW_DAYS[0]), intervalDays: REVIEW_DAYS[0], lapses: 0 },
    }
  }
  return { ...p, skills }
}

export interface BlockSummary {
  id: string
  name: string
  done: number
  total: number
}

export function blockSummaries(p: GuitarProgress): BlockSummary[] {
  const steps = trackSteps(p)
  return CHORD_BLOCKS.map((b) => {
    const mine = steps.filter((s) => s.skill.block === b.name)
    return { id: b.id, name: b.name, done: mine.filter((s) => s.state === 'done').length, total: mine.length }
  })
}
