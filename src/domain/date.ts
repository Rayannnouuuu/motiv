import type { Day } from './types'

const parisFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const parisClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris',
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

const DAY_MS = 86_400_000

function toUtc(day: Day): number {
  const [y, m, d] = day.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fromUtc(ms: number): Day {
  return new Date(ms).toISOString().slice(0, 10)
}

export function todayParis(now: Date = new Date()): Day {
  return parisFormat.format(now)
}

/**
 * Millisecondes jusqu'au prochain 00:00 à Paris (toujours > 0).
 * Les jours de changement d'heure durent 23 ou 25 h : l'écart d'une heure est absorbé par l'appelant.
 */
export function msUntilNextParisMidnight(now: Date): number {
  const parts = parisClock.formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  const elapsed = ((part('hour') * 60 + part('minute')) * 60 + part('second')) * 1000 + now.getUTCMilliseconds()
  return DAY_MS - elapsed
}

export function addDays(day: Day, n: number): Day {
  return fromUtc(toUtc(day) + n * DAY_MS)
}

/** Lundi de la semaine du jour donné. */
export function weekStart(day: Day): Day {
  const weekday = new Date(toUtc(day)).getUTCDay() // 0 = dimanche
  return addDays(day, -((weekday + 6) % 7))
}

export function daysBetween(from: Day, to: Day): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
}
