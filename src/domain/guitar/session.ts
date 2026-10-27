/**
 * Séance guidée (GUITARE.md §5) : selon la durée, des blocs construits à partir de mes compétences en cours,
 * des entretiens dus et de mon morceau en cours, avec un seul objectif chiffré. Pur, sans interface.
 */
import { getExercise } from '../../content/exercises'
import { getSkill, SKILLS, type Skill } from '../../content/guitar'
import { daysBetween, weekStart } from '../date'
import type { GuitarState, Song } from '../model'
import type { Day } from '../types'
import { dueReviews, learning, MAX_LEARNING, skillStatus, startSkill, suggestNext, tempoProposal, type GuitarProgress } from './engine'

export const DURATIONS = [15, 30, 45, 60] as const
export type Duration = (typeof DURATIONS)[number]
export type BlockKind = 'warmup' | 'focus' | 'maintenance' | 'repertoire' | 'bonus'

/** Minutes par bloc selon la durée (§5). */
const MINUTES: Record<BlockKind, Record<Duration, number>> = {
  warmup: { 15: 2, 30: 4, 45: 5, 60: 6 },
  focus: { 15: 6, 30: 10, 45: 15, 60: 20 },
  maintenance: { 15: 2, 30: 5, 45: 7, 60: 10 },
  repertoire: { 15: 5, 30: 8, 45: 12, 60: 16 },
  bonus: { 15: 0, 30: 3, 45: 6, 60: 8 },
}

export interface SessionBlock {
  kind: BlockKind
  minutes: number
  title: string
  /** Compétence mesurée dans ce bloc (focus, entretien). */
  skillId?: string
  /** Exercice joué (échauffement). */
  exerciseId?: string
  /** Tempo de l'échauffement. */
  bpm?: number
  songId?: string
  /** Consigne en une phrase. */
  hint?: string
  /** Entretien : test court d'une compétence validée. */
  review?: boolean
}

export interface SessionPlan {
  duration: Duration
  blocks: SessionBlock[]
  objective: { skillId: string; text: string; target: number | null } | null
}

/** Garde toujours MAX_LEARNING compétences en cours : démarre celles proposées jusqu'à en avoir 3. */
export function ensureLearning(p: GuitarProgress, today: Day): GuitarProgress {
  let next = p
  while (learning(next).length < MAX_LEARNING) {
    const [first] = suggestNext(next)
    if (!first) break
    next = startSkill(next, first.id, today)
  }
  return next
}

/** Une compétence qui se joue avec un exercice (tablature, métronome) passe avant un quiz saisi à la main. */
const playable = (skillId: string) => {
  const sk = getSkill(skillId)
  return sk !== undefined && (sk.validation.kind === 'tempo' || sk.exerciseIds.length > 0)
}

/** Focus de la semaine : celui choisi s'il est encore en cours, sinon une compétence jouable en cours. */
export function weekFocus(progress: GuitarProgress, focus: GuitarState['focus'], today: Day): string | null {
  const cur = learning(progress)
  const chosen = focus && focus.week === weekStart(today) ? focus.skillId : null
  return cur.find((s) => s.skillId === chosen)?.skillId ?? cur.find((s) => playable(s.skillId))?.skillId ?? cur[0]?.skillId ?? null
}

/** Morceaux proposés pour le répertoire : en cours d'abord, puis ceux à apprendre ou à entretenir ; jamais les maîtrisés seuls. */
export function songChoices(songs: Song[]): Song[] {
  const rank = (s: Song) => (s.status === 'learning' ? 0 : s.status === 'to_learn' ? 1 : s.status === 'maintain' ? 2 : 3)
  return songs.filter((s) => s.status !== 'mastered').sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title, 'fr'))
}

const KIND_GOAL = (s: Skill, best: number | undefined): { text: string; target: number | null } => {
  const v = s.validation
  switch (v.kind) {
    case 'changes_per_minute': {
      const from = best ?? 0
      const to = Math.min(v.target, best === undefined ? 15 : from + 3)
      return { text: `${s.name} : passer de ${from} à ${to} changements`, target: to }
    }
    case 'quiz':
      return { text: `${s.name} : score d’au moins ${v.minScore} %`, target: v.minScore }
    case 'checklist':
      return { text: `${s.name} : toutes les cases cochées`, target: null }
    case 'pitch':
      return { text: `${s.name} : ${v.hitsOutOf[0]} bends justes sur ${v.hitsOutOf[1]}`, target: v.hitsOutOf[0] }
    case 'recording':
      return { text: `${s.name} : une prise notée ${v.minAverage} ou plus à la grille`, target: v.minAverage }
    case 'tempo':
      return { text: s.name, target: v.bpm }
  }
}

/** Un seul objectif chiffré pour la séance, sur la compétence focus. */
export function objectiveOf(skill: Skill, p: GuitarProgress): { skillId: string; text: string; target: number | null } {
  const own = p.skills[skill.id]
  if (skill.validation.kind === 'tempo') {
    const t = tempoProposal(skill, own)!
    const last = own?.attempts.at(-1)?.value
    return { skillId: skill.id, text: `${skill.name} : ${last !== undefined ? `de ${last} à ${t.bpm}` : `à ${t.bpm}`} bpm, propre`, target: t.bpm }
  }
  return { skillId: skill.id, ...KIND_GOAL(skill, own?.best) }
}

const BONUS = [
  ['Oreille', 'Joue une note au hasard, retrouve-la sur la guitare puis chante-la.'],
  ['Manche', 'Quiz de notes de 3 minutes sur la corde de Mi grave et celle de La.'],
  ['Improvisation', 'Boucle de 2 minutes sur la pentatonique, des phrases courtes et des silences.'],
  ['Composition', 'Note un riff de 4 mesures, enregistre-le.'],
] as const

/** La séance du jour selon la durée choisie. */
export function generateSession(opts: { duration: Duration; progress: GuitarProgress; focus?: GuitarState['focus']; today: Day; songs: Song[] }): SessionPlan {
  const { duration, progress, today } = opts
  const m = (k: BlockKind) => MINUTES[k][duration]
  const blocks: SessionBlock[] = []

  const warm = progress.skills['chromatic-quarter']?.status === 'validated' ? 'chromatic-3' : 'chromatic-1'
  const ex = getExercise(warm)!
  const record = progress.skills['chromatic-quarter']?.best
  blocks.push({
    kind: 'warmup',
    minutes: m('warmup'),
    title: ex.title,
    exerciseId: warm,
    bpm: Math.max(30, Math.round((record ?? ex.startBpm) * 0.8)),
    hint: 'À 80 % de ton record propre : on réveille les doigts, sans forcer.',
  })

  const focusId = weekFocus(progress, opts.focus, today)
  const focus = focusId ? getSkill(focusId) : undefined
  if (focus) blocks.push({ kind: 'focus', minutes: m('focus'), title: focus.name, skillId: focus.id, hint: focus.howTo })

  const due = dueReviews(progress, today)[0]
  const rest = learning(progress).filter((l) => l.skillId !== focusId)
  const other = rest.find((l) => playable(l.skillId)) ?? rest[0]
  const kept = due ? { id: due.skillId, review: true } : other ? { id: other.skillId, review: false } : null
  const keptSkill = kept ? getSkill(kept.id) : undefined
  if (keptSkill && kept)
    blocks.push({
      kind: 'maintenance',
      minutes: m('maintenance'),
      title: keptSkill.name,
      skillId: keptSkill.id,
      review: kept.review,
      hint: kept.review ? 'Test court : tu l’as déjà validée, on vérifie qu’elle tient.' : keptSkill.howTo,
    })

  const choices = songChoices(opts.songs)
  const day = daysBetween('2026-01-01', today)
  // En cours : on en change chaque jour ; sinon un morceau à apprendre, le même toute la semaine.
  const ongoing = choices.filter((s) => s.status === 'learning')
  const song = ongoing.length ? ongoing[day % ongoing.length] : choices.length ? choices[Math.floor(day / 7) % choices.length] : undefined
  blocks.push({
    kind: 'repertoire',
    minutes: m('repertoire'),
    title: song ? song.title : 'Un morceau de ta liste',
    songId: song?.id,
    hint: 'Une section du morceau (8 mesures), lentement d’abord, puis au tempo.',
  })

  if (m('bonus') > 0) {
    const [title, hint] = BONUS[day % BONUS.length]
    blocks.push({ kind: 'bonus', minutes: m('bonus'), title, hint })
  }
  return { duration, blocks, objective: focus ? objectiveOf(focus, progress) : null }
}

export const levelOfFocus = (id: string) => SKILLS.find((s) => s.id === id)?.level ?? 0
export { skillStatus }
