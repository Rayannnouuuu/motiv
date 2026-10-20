import { upcomingPrograms } from './progression'
import { sportWeek } from './sportWeek'
import { guitarStreak } from './streak'
import type { AppData, Day } from './types'

export interface NextAction {
  kind: 'resumeSport' | 'resumeGuitar' | 'playGuitar' | 'startSport' | 'done'
  label: string
  to?: string
  state?: object
}

/**
 * La seule chose à faire maintenant, affichée tout en haut de l'accueil. Par priorité :
 * une séance en cours (sport, puis chrono guitare), la guitare du jour, la séance de sport due, sinon rien.
 * Le libellé est du texte seul : l'écran choisit l'icône et la couleur selon `kind`.
 */
export function nextAction({
  data,
  today,
  guitarLiveMin,
  sportLiveProgram,
}: {
  data: Pick<AppData, 'guitarSessions' | 'sportSessions' | 'programs'>
  today: Day
  /** Minutes du chrono guitare en cours, null sans chrono. */
  guitarLiveMin: number | null
  /** Nom du programme de la séance de sport en cours, null sans séance. */
  sportLiveProgram: string | null
}): NextAction {
  if (sportLiveProgram !== null) return { kind: 'resumeSport', label: `Reprendre ${sportLiveProgram}`, to: '/log/sport' }
  if (guitarLiveMin !== null) return { kind: 'resumeGuitar', label: `Reprendre la guitare · ${guitarLiveMin} min`, to: '/jouer' }

  const { remainingMin } = guitarStreak(data.guitarSessions, today)
  if (remainingMin > 0) return { kind: 'playGuitar', label: `Jouer · encore ${remainingMin} min`, to: '/jouer', state: { autostart: true } }

  const [next] = upcomingPrograms(data.programs, data.sportSessions, 1)
  const week = sportWeek(data.sportSessions, today)
  const sportToday = data.sportSessions.some((s) => s.day === today)
  if (next && week.remaining > 0 && !sportToday) return { kind: 'startSport', label: `Commencer ${next.name}`, to: '/log/sport', state: { programId: next.id } }

  return { kind: 'done', label: 'Journée bouclée' }
}
