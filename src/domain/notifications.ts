import { describeTarget } from './challenges'
import { challengeProgress } from './challengeProgress'
import { dailyPlan } from './dailyPlan'
import { addDays, daysBetween, todayParis, weekStart } from './date'
import { allLevels } from './levels'
import { upcomingPrograms } from './progression'
import { sportWeek } from './sportWeek'
import { guitarStreak } from './streak'
import type { AppData, Day } from './types'

export type NotificationKind = 'plan' | 'sport' | 'challenge' | 'streak'

export interface PushMessage {
  kind: NotificationKind
  title: string
  body: string
  url: string
}

/** Plages d'envoi (minutes depuis minuit, heure de Paris) : l'heure exacte est tirée au hasard chaque jour. */
export const WINDOWS: Record<NotificationKind, [number, number]> = {
  plan: [8 * 60, 12 * 60],
  sport: [12 * 60, 20 * 60],
  challenge: [10 * 60, 21 * 60],
  streak: [17 * 60, 21 * 60],
}
const SLOT_STEP = 5 // minutes
/** Rappel de défi bloquant : un jour sur trois. */
const CHALLENGE_EVERY_DAYS = 3

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Minute d'envoi du jour pour un type de rappel : aléatoire mais stable (même seed + même jour = même heure). */
export function slotMinute(seed: string, day: Day, kind: NotificationKind): number {
  const [from, to] = WINDOWS[kind]
  const steps = Math.floor((to - from) / SLOT_STEP)
  return from + (hash(`${seed}|${day}|${kind}`) % steps) * SLOT_STEP
}

/** Minutes écoulées depuis minuit à Paris. */
export function parisMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return get('hour') * 60 + get('minute')
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`

/** Message d'un type de rappel, ou null s'il n'a pas lieu d'être aujourd'hui. */
export function buildMessage(kind: NotificationKind, data: AppData, today: Day): PushMessage | null {
  const streak = guitarStreak(data.guitarSessions, today)
  const week = sportWeek(data.sportSessions, today)
  const [next] = upcomingPrograms(data.programs, data.sportSessions, 1)
  const sportToday = data.sportSessions.some((s) => s.day === today)

  switch (kind) {
    case 'plan': {
      const exos = dailyPlan(data, today).map((e) => e.title)
      const sport = next && week.remaining > 0 && !sportToday ? `\n🏋️ Séance du jour : ${next.name}` : ''
      return { kind, title: 'Ton plan du jour', body: `🎸 ${exos.join(' · ')}${sport}`, url: '/motiv/' }
    }
    case 'streak': {
      if (streak.remainingMin === 0) return null
      const body =
        streak.days > 0
          ? `Encore ${streak.remainingMin} min de guitare pour tenir ta série de ${plural(streak.days, 'jour', 'jours')} 🔥`
          : `Lance ta série : ${streak.remainingMin} min de guitare aujourd'hui 🔥`
      return { kind, title: 'Ta série guitare', body, url: '/motiv/log/guitare' }
    }
    case 'sport': {
      // Seulement quand il faut s'y mettre : autant de séances à faire que de jours restants (ou moins de jours).
      const daysLeft = daysBetween(today, addDays(weekStart(today), 6)) + 1
      if (!next || week.remaining === 0 || sportToday || week.remaining < daysLeft) return null
      return {
        kind,
        title: 'Ta semaine de sport',
        body: `Encore ${plural(week.remaining, 'séance', 'séances')} pour valider ta semaine 💪 Prochaine : ${next.name}`,
        url: '/motiv/log/sport',
      }
    }
    case 'challenge': {
      const levels = allLevels(data)
      for (const domain of ['guitar', 'sport'] as const) {
        if (!levels[domain].blocked) continue
        const ch = data.challenges.find((c) => c.domain === domain && c.status === 'active' && c.level === levels[domain].level)
        if (!ch?.blockedSince || daysBetween(ch.blockedSince, today) % CHALLENGE_EVERY_DAYS !== 0) continue
        const p = challengeProgress(ch, data, today)
        const progress = p.unit === 'morceau' ? '' : ` (${p.current}/${p.target} ${p.unit})`
        return { kind, title: '🎯 Défi requis', body: `${describeTarget(ch.target, data)}${progress} : réussis-le pour passer au niveau suivant.`, url: '/motiv/' }
      }
      return null
    }
  }
}

/** Rappels dont l'heure tirée tombe dans la dernière fenêtre de `windowMin` minutes (appel toutes les `windowMin` min). */
export function dueMessages(seed: string, data: AppData, now: Date, windowMin = 15): PushMessage[] {
  const today = todayParis(now)
  const minute = parisMinutes(now)
  return (Object.keys(WINDOWS) as NotificationKind[]).flatMap((kind) => {
    const slot = slotMinute(seed, today, kind)
    if (slot > minute || slot <= minute - windowMin) return []
    const msg = buildMessage(kind, data, today)
    return msg ? [msg] : []
  })
}
