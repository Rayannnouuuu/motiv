/**
 * Moteur du parcours guitare (GUITARE.md §4) : états des compétences, validation sur plusieurs jours, tempo,
 * entretien espacé, plateau, choix de la suivante, diagnostic, niveau du parcours (qui ne sert qu'à débloquer
 * des exercices) et jouabilité des morceaux. Pur : pas d'interface, pas de stockage.
 */
import { EXERCISES, getExercise, type Exercise } from '../../content/exercises'
import { getSkill, PATH, SKILLS, type Pillar, type Skill, type Validation } from '../../content/guitar'
import { addDays } from '../date'
import type { Day } from '../types'

export const MAX_LEARNING = 3
/** Intervalles de l'entretien espacé, en jours. */
export const REVIEW_DAYS = [3, 7, 14, 30, 60]
export const PLATEAU_ATTEMPTS = 6
export const BPM_STEP = 4

/** Un essai du test d'une compétence. `value` : bpm, changements, score (%), réussites sur 10 ou moyenne de la grille. */
export interface Attempt {
  day: Day
  value: number
  /** Tempo : joué propre. Checklist : toutes les cases cochées. */
  clean?: boolean
  /** Quiz : temps moyen par question. */
  seconds?: number
  passed: boolean
}

export interface SkillProgress {
  skillId: string
  status: 'learning' | 'validated'
  /** Entretien raté : à consolider, sans perdre la validation. */
  fragile: boolean
  startedAt: Day
  validatedAt?: Day
  /** Validée d'avance au diagnostic d'entrée. */
  diagnosed?: boolean
  best?: number
  attempts: Attempt[]
  review?: { dueAt: Day; intervalDays: number; lapses: number }
}

export interface GuitarProgress {
  skills: Record<string, SkillProgress>
  /** Épreuves de niveau réussies : niveau → jour. */
  exams: Record<number, Day>
}

export const EMPTY_PROGRESS: GuitarProgress = { skills: {}, exams: {} }

export type SkillStatus = 'locked' | 'available' | 'learning' | 'validated'

export function skillStatus(skill: Skill, p: GuitarProgress): SkillStatus {
  const own = p.skills[skill.id]
  if (own) return own.status
  return skill.prerequisites.every((id) => p.skills[id]?.status === 'validated') ? 'available' : 'locked'
}

/** Mise en place ou étape d'un parcours : ni dans les 3 en cours, ni dans les entretiens de séance. */
const isSetup = (id: string) => {
  const s = getSkill(id)
  return s?.setup === true || s?.track !== undefined
}

/** Compétences en cours (la mise en place n'en fait pas partie : elle ne compte ni dans les 3, ni dans la séance). */
export const learning = (p: GuitarProgress) => Object.values(p.skills).filter((s) => s.status === 'learning' && !isSetup(s.skillId))

/** Jours différents nécessaires pour valider. */
export const sessionsNeeded = (v: Validation) => ('sessions' in v ? v.sessions : 1)

/** Le test est-il réussi par cet essai ? */
export function passes(v: Validation, a: Omit<Attempt, 'passed'>): boolean {
  switch (v.kind) {
    case 'tempo':
      return a.value >= v.bpm && a.clean === true
    case 'changes_per_minute':
      return a.value >= v.target
    case 'checklist':
      return a.clean === true
    case 'quiz':
      return a.value >= v.minScore && (v.maxSecondsPerItem === undefined || (a.seconds ?? Infinity) <= v.maxSecondsPerItem)
    case 'pitch':
      return a.value >= v.hitsOutOf[0]
    case 'recording':
      return a.value >= v.minAverage
  }
}

/** Démarrer une compétence : disponible, et 3 en cours au plus. */
export function startSkill(p: GuitarProgress, skillId: string, today: Day): GuitarProgress {
  const skill = getSkillOrThrow(skillId)
  const status = skillStatus(skill, p)
  if (status !== 'available') throw new Error(status === 'locked' ? 'Compétence verrouillée : valide d’abord ses prérequis.' : 'Compétence déjà commencée.')
  if (!skill.setup && !skill.track && learning(p).length >= MAX_LEARNING) throw new Error(`Déjà ${MAX_LEARNING} compétences en cours : termine-en une d’abord.`)
  return { ...p, skills: { ...p.skills, [skillId]: { skillId, status: 'learning', fragile: false, startedAt: today, attempts: [] } } }
}

const getSkillOrThrow = (id: string) => {
  const s = getSkill(id)
  if (!s) throw new Error(`Compétence inconnue : ${id}`)
  return s
}

const firstReview = (today: Day) => ({ dueAt: addDays(today, REVIEW_DAYS[0]), intervalDays: REVIEW_DAYS[0], lapses: 0 })

/**
 * Un essai : en cours, la compétence est validée quand le test est réussi sur assez de jours différents ; validée,
 * c'est un entretien : réussi, l'intervalle suivant ; raté, retour à 3 jours et « à consolider ».
 */
export function recordAttempt(p: GuitarProgress, skillId: string, raw: Omit<Attempt, 'passed'>): GuitarProgress {
  const skill = getSkillOrThrow(skillId)
  const own = p.skills[skillId]
  if (!own) throw new Error('Commence la compétence avant de noter un essai.')
  const attempt: Attempt = { ...raw, passed: passes(skill.validation, raw) }
  const best = attempt.value > (own.best ?? -Infinity) && (skill.validation.kind !== 'tempo' || attempt.clean) ? attempt.value : own.best
  let next: SkillProgress = { ...own, attempts: [...own.attempts, attempt], ...(best !== undefined ? { best } : {}) }

  if (own.status === 'learning') {
    const days = new Set(next.attempts.filter((a) => a.passed).map((a) => a.day))
    if (days.size >= sessionsNeeded(skill.validation)) next = { ...next, status: 'validated', validatedAt: raw.day, review: firstReview(raw.day) }
  } else if (own.review && raw.day >= own.review.dueAt) {
    const i = REVIEW_DAYS.indexOf(own.review.intervalDays)
    next = attempt.passed
      ? {
          ...next,
          fragile: false,
          review: {
            ...own.review,
            intervalDays: REVIEW_DAYS[Math.min(i + 1, REVIEW_DAYS.length - 1)],
            dueAt: addDays(raw.day, REVIEW_DAYS[Math.min(i + 1, REVIEW_DAYS.length - 1)]),
          },
        }
      : { ...next, fragile: true, review: { dueAt: addDays(raw.day, REVIEW_DAYS[0]), intervalDays: REVIEW_DAYS[0], lapses: own.review.lapses + 1 } }
  }
  return { ...p, skills: { ...p.skills, [skillId]: next } }
}

/** Mise en place cochée avant la séance : démarre la compétence si besoin et note un essai réussi (validée en 2 jours). */
export function recordSetup(p: GuitarProgress, skillId: string, today: Day): GuitarProgress {
  const started = skillStatus(getSkillOrThrow(skillId), p) === 'available' ? startSkill(p, skillId, today) : p
  return recordAttempt(started, skillId, { day: today, value: 1, clean: true })
}

/** Entretiens dus aujourd'hui, les plus en retard d'abord. */
export const dueReviews = (p: GuitarProgress, today: Day) =>
  Object.values(p.skills)
    .filter((s) => s.status === 'validated' && s.review && s.review.dueAt <= today && !isSetup(s.skillId))
    .sort((a, b) => a.review!.dueAt.localeCompare(b.review!.dueAt))

/** Tempo proposé pour un test de tempo : +4 après 3 séances propres, −10 % après 2 séances pas propres. */
export function tempoProposal(skill: Skill, s: SkillProgress | undefined): { bpm: number; why: string } | null {
  if (skill.validation.kind !== 'tempo') return null
  const start = getExercise(skill.validation.exerciseId)?.startBpm ?? skill.validation.bpm
  const tries = s?.attempts ?? []
  const last = tries.at(-1)
  if (!last) return { bpm: start, why: `Premier essai : on démarre à ${start} bpm.` }
  const last3 = tries.slice(-3)
  if (last3.length === 3 && last3.every((a) => a.clean)) {
    const t = Math.min(...last3.map((a) => a.value))
    return { bpm: t + BPM_STEP, why: `Propre 3 séances de suite à ${t} bpm : on passe à ${t + BPM_STEP}.` }
  }
  const last2 = tries.slice(-2)
  if (last2.length === 2 && last2.every((a) => !a.clean)) {
    const bpm = Math.max(30, Math.round(last.value * 0.9))
    return { bpm, why: `Deux séances pas propres : on redescend de 10 %, à ${bpm} bpm, là où c’est propre.` }
  }
  return { bpm: last.value, why: `On reste à ${last.value} bpm jusqu’à 3 séances propres de suite.` }
}

/** Plateau : aucun nouveau meilleur résultat sur les 6 derniers essais. Propositions dans l'ordre du §4. */
export function plateau(skill: Skill, s: SkillProgress | undefined): string[] | null {
  const tries = s?.attempts ?? []
  if (tries.length < PLATEAU_ATTEMPTS) return null
  const before = tries.slice(0, -PLATEAU_ATTEMPTS)
  const recent = tries.slice(-PLATEAU_ATTEMPTS)
  const bestBefore = before.length ? Math.max(...before.map((a) => a.value)) : -Infinity
  const improved = before.length ? recent.some((a) => a.value > bestBefore) : Math.max(...recent.map((a) => a.value)) > recent[0].value
  if (improved) return null
  const v = skill.validation
  const slower =
    v.kind === 'tempo' ? `Ralentis de 20 % : ${Math.round((s?.best ?? v.bpm) * 0.8)} bpm, très propre.` : 'Ralentis de 20 % : plus lent, très propre.'
  const variant = skill.exerciseIds.map((id) => getExercise(id)).find((e) => e && (v.kind !== 'tempo' || e.id !== v.exerciseId))
  return [
    slower,
    'Découpe le passage difficile : travaille seulement les 2 notes ou les 2 accords qui coincent.',
    variant ? `Change de variante : ${variant.title}.` : 'Change de variante : un autre exercice de la même famille.',
    'Vérifie ta posture : filme-toi 30 secondes et compare à la fiche.',
  ]
}

/**
 * Prochaines compétences proposées : celles disponibles du niveau en cours (le plus bas pas fini), en commençant
 * par les piliers les moins représentés parmi celles en cours. Si rien n'est disponible à ce niveau (prérequis en
 * cours), celles des niveaux suivants : une place ne reste pas vide.
 */
export function suggestNext(p: GuitarProgress): Skill[] {
  const available = SKILLS.filter((s) => !s.setup && skillStatus(s, p) === 'available')
  if (available.length === 0) return []
  const level = Math.min(...SKILLS.filter((s) => !s.setup && skillStatus(s, p) !== 'validated').map((s) => s.level))
  const pool = available.filter((s) => s.level === level)
  const busy = new Map<Pillar, number>()
  for (const l of learning(p)) {
    const pillar = SKILLS.find((s) => s.id === l.skillId)?.pillar
    if (pillar) busy.set(pillar, (busy.get(pillar) ?? 0) + 1)
  }
  return (pool.length ? pool : available).sort((a, b) => (busy.get(a.pillar) ?? 0) - (busy.get(b.pillar) ?? 0))
}

/** Diagnostic d'entrée : valide d'avance les compétences que je sais déjà faire (tests passés), entretien prévu. */
export function diagnose(p: GuitarProgress, skillIds: string[], today: Day): GuitarProgress {
  const skills = { ...p.skills }
  for (const id of skillIds) {
    getSkillOrThrow(id)
    skills[id] = {
      skillId: id,
      status: 'validated',
      fragile: false,
      startedAt: today,
      validatedAt: today,
      diagnosed: true,
      attempts: [],
      review: firstReview(today),
    }
  }
  return { ...p, skills }
}

const levelSkills = (level: number) => SKILLS.filter((s) => s.level === level)
const levelValidated = (p: GuitarProgress, level: number) => levelSkills(level).every((s) => p.skills[s.id]?.status === 'validated')

/** L'épreuve d'un niveau se débloque quand toutes ses compétences sont validées. */
export const examAvailable = (p: GuitarProgress, level: number) =>
  PATH.levels.some((l) => l.level === level && l.exam) && levelValidated(p, level) && !p.exams[level]

export function passExam(p: GuitarProgress, level: number, today: Day): GuitarProgress {
  if (!examAvailable(p, level)) throw new Error('Épreuve pas encore disponible : valide toutes les compétences du niveau.')
  return { ...p, exams: { ...p.exams, [level]: today } }
}

/**
 * Niveau du parcours : les niveaux finis d'affilée depuis 0 (compétences validées et épreuve réussie, ou tout
 * validé d'avance au diagnostic). Il ne sert qu'à débloquer des exercices.
 */
export function pathLevel(p: GuitarProgress): number {
  let level = 0
  for (const l of PATH.levels) {
    const all = levelSkills(l.level)
    const done = levelValidated(p, l.level) && (p.exams[l.level] !== undefined || all.every((s) => p.skills[s.id]?.diagnosed))
    if (!done) break
    level = l.level + 1
  }
  return Math.min(level, PATH.levels.length - 1)
}

/** Niveau d'un exercice : le plus bas des compétences qui l'utilisent, sinon déduit de sa difficulté (hors parcours). */
export function exerciseLevel(e: Exercise): number {
  const used = SKILLS.filter((s) => s.exerciseIds.includes(e.id) || (s.validation.kind === 'tempo' && s.validation.exerciseId === e.id))
  if (used.length) return Math.min(...used.map((s) => s.level))
  return Math.min(5, Math.ceil(e.difficulty / 2))
}

/** Exercices hors parcours : rattachés à aucune compétence (gardés, historique intact). */
export const offPath = (e: Exercise) => !SKILLS.some((s) => s.exerciseIds.includes(e.id) || (s.validation.kind === 'tempo' && s.validation.exerciseId === e.id))

/** Exercices débloqués : ceux dont le niveau ne dépasse pas le niveau du parcours. */
export const unlockedExercises = (p: GuitarProgress) => {
  const level = pathLevel(p)
  return EXERCISES.filter((e) => exerciseLevel(e) <= level)
}

/** Jouabilité d'un morceau : part des compétences demandées déjà validées. À 80 % « prêt à apprendre », à 100 % « à ta portée ». */
export function playability(skillIds: string[], p: GuitarProgress): { ratio: number; label: 'à ta portée' | 'prêt à apprendre' | null } {
  if (skillIds.length === 0) return { ratio: 0, label: null }
  const ratio = skillIds.filter((id) => p.skills[id]?.status === 'validated').length / skillIds.length
  return { ratio, label: ratio === 1 ? 'à ta portée' : ratio >= 0.8 ? 'prêt à apprendre' : null }
}

/** Protection du débutant : les 3 premières semaines, séances de 15 à 20 min. */
export const beginnerMinutes = (firstDay: Day | null, today: Day): { min: number; max: number } | null =>
  firstDay && today < addDays(firstDay, 21) ? { min: 15, max: 20 } : null
