/**
 * Observations croisées (lot 5) : des liens entre guitare, sport et sommeil, seulement après 4 semaines de
 * données, et toujours avec le nombre de séances derrière le chiffre. Un écart trop petit n'est pas montré.
 */
import { addDays } from './date'
import type { Checkin } from './model'
import type { AppData, Day } from './types'

export const OBSERVE_AFTER_DAYS = 28
/** Au moins 3 séances de chaque côté pour comparer. */
const MIN_EACH = 3
const MIN_GAP_MIN = 5
const MIN_GAP_SCORE = 0.5

export interface Observation {
  text: string
  /** Ce qu'il y a derrière : « 12 séances contre 20 ». */
  basis: string
}

const avg = (v: number[]) => v.reduce((t, x) => t + x, 0) / v.length
const one = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const sessions = (n: number) => `${n} séance${n > 1 ? 's' : ''}`
const HOUR = new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Paris' })
const parisHour = (iso: string) => Number(HOUR.formatToParts(new Date(iso)).find((p) => p.type === 'hour')!.value)

/** Compare deux groupes ; null si l'un est trop petit ou l'écart trop faible. */
function compare(a: number[], b: number[], gap: number): { a: number; b: number } | null {
  if (a.length < MIN_EACH || b.length < MIN_EACH) return null
  const x = avg(a)
  const y = avg(b)
  return Math.abs(x - y) >= gap ? { a: x, b: y } : null
}

export function observations(data: AppData, checkins: Checkin[], today: Day): Observation[] {
  const first = [...data.guitarSessions, ...data.sportSessions].map((s) => s.day).sort()[0]
  if (!first || first > addDays(today, -OBSERVE_AFTER_DAYS)) return []
  const out: Observation[] = []
  const guitar = data.guitarSessions.filter((s) => s.day <= today)
  const sportDays = new Set(data.sportSessions.map((s) => s.day))
  const withSport = guitar.filter((s) => sportDays.has(s.day))
  const without = guitar.filter((s) => !sportDays.has(s.day))

  const minutes = compare(
    withSport.map((s) => s.durationMin),
    without.map((s) => s.durationMin),
    MIN_GAP_MIN,
  )
  if (minutes)
    out.push({
      text: `Tes séances guitare durent ${Math.round(Math.abs(minutes.a - minutes.b))} min de ${minutes.a > minutes.b ? 'plus' : 'moins'} les jours où tu fais du sport.`,
      basis: `${sessions(withSport.length)} avec sport, ${without.length} sans`,
    })

  const desire = compare(
    withSport.map((s) => s.desireRating),
    without.map((s) => s.desireRating),
    MIN_GAP_SCORE,
  )
  if (desire)
    out.push({
      text: `Ton envie de rejouer est plus ${desire.a > desire.b ? 'haute' : 'basse'} les jours de sport (${one(desire.a)} contre ${one(desire.b)} sur 5).`,
      basis: `${sessions(withSport.length)} avec sport, ${without.length} sans`,
    })

  const morning = guitar.filter((s) => parisHour(s.createdAt) < 12)
  const evening = guitar.filter((s) => parisHour(s.createdAt) >= 18)
  const flow = compare(
    morning.map((s) => s.flowRating),
    evening.map((s) => s.flowRating),
    MIN_GAP_SCORE,
  )
  if (flow)
    out.push({
      text: `Tu perds plus la notion du temps ${flow.a > flow.b ? 'le matin' : 'le soir'} (${one(Math.max(flow.a, flow.b))} contre ${one(Math.min(flow.a, flow.b))} sur 5).`,
      basis: `${sessions(morning.length)} le matin, ${evening.length} le soir`,
    })

  const slept = new Map(checkins.filter((c) => c.sleepHours !== null).map((c) => [c.day, c.sleepHours!]))
  const rested = guitar.filter((s) => (slept.get(s.day) ?? -1) >= 7)
  const short = guitar.filter((s) => slept.has(s.day) && slept.get(s.day)! < 7)
  const sleep = compare(
    rested.map((s) => s.durationMin),
    short.map((s) => s.durationMin),
    MIN_GAP_MIN,
  )
  if (sleep)
    out.push({
      text: `Après 7 h de sommeil ou plus, tes séances guitare durent ${Math.round(Math.abs(sleep.a - sleep.b))} min de ${sleep.a > sleep.b ? 'plus' : 'moins'}.`,
      basis: `${sessions(rested.length)} bien reposé, ${short.length} après une nuit courte`,
    })
  return out.slice(0, 3)
}
