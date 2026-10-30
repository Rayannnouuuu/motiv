/**
 * Parcours des accords (lot 18) et des gammes (lot 19) : l'état de chaque étape (faite, en cours, verrouillée),
 * le raccourci « je le sais déjà » et la validation d'office des grosses étapes du parcours général.
 * Pur : la progression est celle du moteur.
 */
import { getSkill, TRACK_SKILLS, type Skill } from '../../content/guitar'
import { PATH_COVERS } from '../../content/guitar/tracks'
import { addDays } from '../date'
import type { Day } from '../types'
import { diagnose, REVIEW_DAYS, startSkill, type GuitarProgress } from './engine'

export type Track = 'chords' | 'scales'
export type StepState = 'done' | 'current' | 'locked'

export interface Step {
  skill: Skill
  state: StepState
}

const skillsOf = (track: Track) => TRACK_SKILLS.filter((s) => s.track === track)

export const trackSteps = (p: GuitarProgress, track: Track): Step[] => {
  let currentSeen = false
  return skillsOf(track).map((skill) => {
    if (p.skills[skill.id]?.status === 'validated') return { skill, state: 'done' as const }
    if (!currentSeen) {
      currentSeen = true
      return { skill, state: 'current' as const }
    }
    return { skill, state: 'locked' as const }
  })
}

export const currentStep = (p: GuitarProgress, track: Track): Skill | null => trackSteps(p, track).find((s) => s.state === 'current')?.skill ?? null

export const trackDone = (p: GuitarProgress, track: Track) => trackSteps(p, track).filter((s) => s.state === 'done').length

/** L'étape en cours est ouverte (état « en cours » du moteur) avant d'y noter un essai. */
export function openStep(p: GuitarProgress, skillId: string, today: Day): GuitarProgress {
  return p.skills[skillId] ? p : startSkill(p, skillId, today)
}

/** « Je le sais déjà » : valide cette étape et toutes celles d'avant dans sa piste, entretien prévu. */
export function knownUpTo(p: GuitarProgress, skillId: string, today: Day): GuitarProgress {
  const target = TRACK_SKILLS.find((s) => s.id === skillId)
  if (!target?.track) throw new Error(`Étape inconnue : ${skillId}`)
  const mine = skillsOf(target.track)
  const ids = mine
    .slice(0, mine.indexOf(target) + 1)
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
  name: string
  done: number
  total: number
}

/** Les blocs d'une piste, dans l'ordre, avec ce qui est fait. */
export function blockSummaries(p: GuitarProgress, track: Track): BlockSummary[] {
  const out: BlockSummary[] = []
  for (const { skill, state } of trackSteps(p, track)) {
    let b = out.find((x) => x.name === skill.block)
    if (!b) out.push((b = { name: skill.block!, done: 0, total: 0 }))
    b.total++
    if (state === 'done') b.done++
  }
  return out
}
