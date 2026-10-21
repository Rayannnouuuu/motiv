import { upcomingPrograms } from './progression'
import { sportWeek } from './sportWeek'
import { guitarToday } from './streak'
import type { AppData, Day } from './types'

export interface NextAction {
  kind: 'resumeSport' | 'resumeGuitar' | 'playGuitar' | 'startPlanned' | 'startSport' | 'done'
  label: string
  to?: string
  state?: object
}

/** Séance du plan sport complet prévue aujourd'hui et pas encore faite (sortie de course, ou muscu). */
export type PlannedToday = Required<Pick<NextAction, 'label' | 'to' | 'state'>>

interface Input {
  data: Pick<AppData, 'guitarSessions' | 'sportSessions' | 'programs'>
  today: Day
  /** Minutes du chrono guitare en cours, null sans chrono. */
  guitarLiveMin: number | null
  /** Nom du programme de la séance de sport en cours, null sans séance. */
  sportLiveProgram: string | null
  /** Séance du plan sport complet du jour (sortie ou muscu), pas encore faite. */
  planned?: PlannedToday | null
  /** Plan marathon en cours : le sport du jour vient du plan, pas de la rotation seule. */
  planActive?: boolean
}

/**
 * Les séances du jour, dans l'ordre : une séance de sport en cours, la guitare (chrono en cours, sinon les
 * minutes qui manquent), puis le sport (la séance du plan marathon, sinon le programme dû). Le libellé est du
 * texte seul : l'écran choisit l'icône et la couleur selon `kind`.
 */
export function todayQueue({ data, today, guitarLiveMin, sportLiveProgram, planned = null, planActive = false }: Input): NextAction[] {
  const queue: NextAction[] = []
  if (sportLiveProgram !== null) queue.push({ kind: 'resumeSport', label: `Reprendre ${sportLiveProgram}`, to: '/log/sport' })

  const { remainingMin } = guitarToday(data.guitarSessions, today)
  if (guitarLiveMin !== null) queue.push({ kind: 'resumeGuitar', label: `Reprendre la guitare · ${guitarLiveMin} min`, to: '/jouer' })
  else if (remainingMin > 0) queue.push({ kind: 'playGuitar', label: `Jouer · encore ${remainingMin} min`, to: '/jouer', state: { autostart: true } })

  if (sportLiveProgram !== null) return queue
  if (planned) return [...queue, { kind: 'startPlanned', ...planned }]
  if (planActive) return queue
  const [next] = upcomingPrograms(data.programs, data.sportSessions, 1)
  const week = sportWeek(data.sportSessions, today)
  const sportToday = data.sportSessions.some((s) => s.day === today)
  if (next && week.remaining > 0 && !sportToday)
    queue.push({ kind: 'startSport', label: `Commencer ${next.name}`, to: '/log/sport', state: { programId: next.id } })
  return queue
}

/** La seule chose à faire maintenant : la première séance du jour, sinon la journée est bouclée. */
export function nextAction(input: Input): NextAction {
  return todayQueue(input)[0] ?? { kind: 'done', label: 'Journée bouclée' }
}
