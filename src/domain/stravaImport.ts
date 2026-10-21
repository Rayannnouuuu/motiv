/**
 * Courses Strava (lot 6), par fichier : rien ne part vers Strava, pas de serveur ni de secret.
 * - `activities.csv` de l'export complet du compte (Strava › Paramètres › Mon compte › Télécharger ou supprimer
 *   votre compte › Demander une archive) : toutes les sorties d'un coup ;
 * - un `.gpx` d'une sortie (sur strava.com, menu « … » d'une activité › Exporter GPX).
 * Seules les courses à pied sont gardées. Un doublon (même activité, ou même jour et même distance) est ignoré.
 */
import { todayParis } from './date'
import type { Session } from './model'
import type { Day } from './types'

export interface ImportedRun {
  /** « strava:123 » ou « gpx:2026-10-12T07:31:20Z » : un second import du même fichier ne double rien. */
  externalId: string
  day: Day
  startedAt: string
  km: number
  sec: number
  name: string
}

/** CSV au sens strict : guillemets, virgules et retours à la ligne dans les champs (descriptions). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length > 0) rows.push([...row, field])
  return rows.filter((r) => r.some((x) => x.trim() !== ''))
}

const MONTHS: Record<string, number> = {
  jan: 1,
  janv: 1,
  feb: 2,
  fevr: 2,
  févr: 2,
  mar: 3,
  mars: 3,
  apr: 4,
  avr: 4,
  may: 5,
  mai: 5,
  jun: 6,
  juin: 6,
  jul: 7,
  juil: 7,
  aug: 8,
  aout: 8,
  août: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
  déc: 12,
}

/** « Oct 12, 2026, 7:31:20 AM » ou « 12 oct. 2026, 07:31:20 » (heure UTC dans l'export) → instant ISO. */
export function parseStravaDate(s: string): string | null {
  const t = s.trim().toLowerCase()
  const en = /^([a-zéû]+)\.? (\d{1,2}), (\d{4}),? (\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)?$/.exec(t)
  const fr = /^(\d{1,2}) ([a-zéû]+)\.? (\d{4}),? (\d{1,2}):(\d{2}):(\d{2})$/.exec(t)
  const iso = /^(\d{4})-(\d{2})-(\d{2})[ t](\d{2}):(\d{2}):(\d{2})/.exec(t)
  let y: number, mo: number | undefined, d: number, h: number, mi: number, se: number
  if (en) {
    ;[y, mo, d, h, mi, se] = [+en[3], MONTHS[en[1]], +en[2], +en[4], +en[5], +en[6]]
    if (en[7] === 'pm' && h < 12) h += 12
    if (en[7] === 'am' && h === 12) h = 0
  } else if (fr) [y, mo, d, h, mi, se] = [+fr[3], MONTHS[fr[2]], +fr[1], +fr[4], +fr[5], +fr[6]]
  else if (iso) [y, mo, d, h, mi, se] = [+iso[1], +iso[2], +iso[3], +iso[4], +iso[5], +iso[6]]
  else return null
  if (!mo) return null
  return new Date(Date.UTC(y, mo - 1, d, h, mi, se)).toISOString()
}

const num = (s: string | undefined) => (s === undefined || s.trim() === '' ? NaN : Number(s.trim().replace(',', '.')))
const isRun = (type: string) => /run|course|trail/i.test(type) && !/vélo|velo|ride|bike/i.test(type)

/** Les colonnes de l'export, en anglais ou en français ; la première « Distance » est en km. */
const COLUMNS = {
  id: ['activity id', "id de l'activité"],
  date: ['activity date', "date de l'activité"],
  name: ['activity name', "nom de l'activité"],
  type: ['activity type', "type d'activité"],
  elapsed: ['elapsed time', 'temps écoulé'],
  moving: ['moving time', 'temps de déplacement'],
  distance: ['distance'],
}

export function parseStravaCsv(text: string): { runs: ImportedRun[]; others: number } | null {
  const [head, ...rows] = parseCsv(text)
  if (!head) return null
  const names = head.map((h) => h.trim().toLowerCase())
  const col = (k: keyof typeof COLUMNS) => names.findIndex((n) => COLUMNS[k].includes(n))
  const at = {
    id: col('id'),
    date: col('date'),
    name: col('name'),
    type: col('type'),
    elapsed: col('elapsed'),
    moving: col('moving'),
    distance: col('distance'),
  }
  if (at.date < 0 || at.type < 0 || at.distance < 0 || (at.elapsed < 0 && at.moving < 0)) return null
  const runs: ImportedRun[] = []
  let others = 0
  for (const r of rows) {
    if (!isRun(r[at.type] ?? '')) {
      others++
      continue
    }
    const startedAt = parseStravaDate(r[at.date] ?? '')
    let km = num(r[at.distance])
    // Certains exports donnent la distance en mètres.
    if (km > 500) km /= 1000
    const moving = at.moving >= 0 ? num(r[at.moving]) : NaN
    const sec = Number.isFinite(moving) && moving > 0 ? moving : num(r[at.elapsed])
    if (!startedAt || !(km > 0) || !(sec > 0)) {
      others++
      continue
    }
    runs.push({
      externalId: `strava:${r[at.id]?.trim() || startedAt}`,
      day: todayParis(new Date(startedAt)),
      startedAt,
      km: Math.round(km * 100) / 100,
      sec: Math.round(sec),
      name: r[at.name]?.trim() || 'Course',
    })
  }
  return { runs, others }
}

/** Distance entre deux points GPS, en km (haversine). */
function haversine(a: [number, number], b: [number, number]): number {
  const rad = (x: number) => (x * Math.PI) / 180
  const dLat = rad(b[0] - a[0])
  const dLon = rad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

export function parseGpx(text: string): ImportedRun | null {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) return null
  const pts = [...doc.getElementsByTagName('trkpt')]
    .map((p) => ({
      ll: [Number(p.getAttribute('lat')), Number(p.getAttribute('lon'))] as [number, number],
      time: p.getElementsByTagName('time')[0]?.textContent ?? '',
    }))
    .filter((p) => Number.isFinite(p.ll[0]) && Number.isFinite(p.ll[1]))
  const timed = pts.filter((p) => !Number.isNaN(Date.parse(p.time)))
  if (pts.length < 2 || timed.length < 2) return null
  let km = 0
  for (let i = 1; i < pts.length; i++) km += haversine(pts[i - 1].ll, pts[i].ll)
  const startedAt = new Date(timed[0].time).toISOString()
  const sec = Math.round((Date.parse(timed.at(-1)!.time) - Date.parse(timed[0].time)) / 1000)
  const type = doc.getElementsByTagName('type')[0]?.textContent ?? 'running'
  if (!isRun(type) && !/running/i.test(type)) return null
  return {
    externalId: `gpx:${startedAt}`,
    day: todayParis(new Date(startedAt)),
    startedAt,
    km: Math.round(km * 100) / 100,
    sec,
    name: doc.getElementsByTagName('name')[0]?.textContent?.trim() || 'Course',
  }
}

/** Sorties déjà là : même identifiant, ou une course du même jour à 300 m près (saisie à la main). */
export function splitNew(runs: ImportedRun[], sessions: Session[], runOf: (s: Session) => { km: number } | null): { fresh: ImportedRun[]; known: number } {
  const ids = new Set(sessions.flatMap((s) => (s.externalId ? [s.externalId] : [])))
  const fresh: ImportedRun[] = []
  for (const r of [...runs].sort((a, b) => a.startedAt.localeCompare(b.startedAt))) {
    const same = ids.has(r.externalId) || sessions.some((s) => s.day === r.day && Math.abs((runOf(s)?.km ?? -9) - r.km) <= 0.3)
    const twice = fresh.some((f) => f.externalId === r.externalId)
    if (!same && !twice) fresh.push(r)
  }
  return { fresh, known: runs.length - fresh.length }
}
