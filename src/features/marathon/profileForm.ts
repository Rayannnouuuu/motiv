/** Questionnaire marathon : champs texte ↔ profil, avec la validation (lot 3). */
import { addDays, weekStart } from '../../domain/date'
import {
  DEFAULT_THRESHOLDS,
  type ChronoDistance,
  type MarathonProfile,
  type RaceKind,
  type Sex,
  type Thresholds,
  type Weekday,
} from '../../domain/marathon/profile'
import type { Day } from '../../domain/types'

export interface ProfileForm {
  name: string
  day: Day
  kind: RaceKind
  goal: 'finish' | 'time'
  goalH: string
  goalMin: string
  walkRun: boolean
  height: string
  /** Seulement sans pesée : il devient une pesée du jour. */
  weight: string
  birthYear: string
  sex: Sex | ''
  weeklyKm: string
  longestKm: string
  years: string
  chrono: ChronoDistance | 'none'
  chronoMin: string
  chronoSec: string
  chronoDay: Day
  days: Weekday[]
  longRunDay: Weekday
  gym: boolean
  pains: string
  hrMax: string
  hrRest: string
  thresholds: Record<keyof Thresholds, string>
}

const str = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))

export function toForm(m: MarathonProfile | undefined, today: Day, heightHint: number | null): ProfileForm {
  const goal = m?.race.goalSec ?? null
  const c = m?.level.chrono ?? null
  return {
    name: m?.race.name ?? '',
    // Par défaut, un dimanche dans 24 semaines.
    day: m?.race.day ?? addDays(weekStart(today), 24 * 7 + 6),
    kind: m?.race.kind ?? 'marathon',
    goal: goal ? 'time' : 'finish',
    goalH: goal ? String(Math.floor(goal / 3600)) : '',
    goalMin: goal ? String(Math.round((goal % 3600) / 60)) : '',
    walkRun: m?.walkRun ?? false,
    height: str(m?.body.heightCm ?? heightHint),
    weight: '',
    birthYear: str(m?.body.birthYear),
    sex: m?.body.sex ?? '',
    weeklyKm: str(m?.level.weeklyKm),
    longestKm: str(m?.level.longestKm),
    years: str(m?.level.years),
    chrono: c?.distance ?? 'none',
    chronoMin: c ? String(Math.floor(c.sec / 60)) : '',
    chronoSec: c ? String(c.sec % 60) : '',
    chronoDay: c?.day ?? today,
    days: m?.constraints.days ?? [1, 3, 5, 6],
    longRunDay: m?.constraints.longRunDay ?? 6,
    gym: m?.constraints.gym ?? true,
    pains: m?.health.pains ?? '',
    hrMax: str(m?.health.hrMax),
    hrRest: str(m?.health.hrRest),
    thresholds: Object.fromEntries(Object.entries(m?.thresholds ?? DEFAULT_THRESHOLDS).map(([k, v]) => [k, String(v)])) as Record<keyof Thresholds, string>,
  }
}

/** Nombre dans [lo, hi] ; vide → null ; sinon NaN (erreur). */
function num(s: string, lo: number, hi: number): number | null {
  if (s.trim() === '') return null
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) && n >= lo && n <= hi ? n : NaN
}

export type ParsedForm = { ok: true; profile: MarathonProfile; weightKg: number | null } | { ok: false; errors: string[] }

/**
 * Le profil, ou les erreurs à corriger. `previous` garde l'historique : le plan ne repart du jour (nouveau
 * `startedOn`) que si la course change (date ou distance).
 */
export function fromForm(f: ProfileForm, today: Day, previous: MarathonProfile | undefined): ParsedForm {
  const errors: string[] = []
  const need = (v: number | null, what: string) => {
    if (v === null || Number.isNaN(v)) errors.push(what)
    return v ?? 0
  }
  const opt = (v: number | null, what: string) => {
    if (Number.isNaN(v)) errors.push(what)
    return v === null || Number.isNaN(v) ? null : v
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.day) || f.day <= today) errors.push('La date de course doit être à venir.')
  let goalSec: number | null = null
  if (f.goal === 'time') {
    const h = num(f.goalH, 1, 9)
    const m = num(f.goalMin || '0', 0, 59)
    if (h === null || Number.isNaN(h) || m === null || Number.isNaN(m)) errors.push('Objectif de temps : heures (1 à 9) et minutes.')
    else goalSec = h * 3600 + m * 60
  }
  const heightCm = opt(num(f.height, 120, 230), 'Taille : entre 120 et 230 cm.')
  const weightKg = opt(num(f.weight, 30, 250), 'Poids : entre 30 et 250 kg.')
  const birthYear = opt(num(f.birthYear, 1920, Number(today.slice(0, 4)) - 10), 'Année de naissance invalide.')
  const weeklyKm = need(num(f.weeklyKm || '0', 0, 250), 'Km par semaine : entre 0 et 250.')
  const longestKm = need(num(f.longestKm || '0', 0, 100), 'Plus longue sortie : entre 0 et 100 km.')
  const years = need(num(f.years || '0', 0, 80), 'Années de pratique : entre 0 et 80.')
  let chrono: MarathonProfile['level']['chrono'] = null
  if (f.chrono !== 'none') {
    const m = num(f.chronoMin, 10, 300)
    const s = num(f.chronoSec || '0', 0, 59)
    if (m === null || Number.isNaN(m) || s === null || Number.isNaN(s)) errors.push('Chrono : minutes (10 à 300) et secondes.')
    else chrono = { distance: f.chrono, sec: Math.round(m * 60 + s), day: f.chronoDay || today }
  }
  if (new Set(f.days).size < 3) errors.push('Choisis au moins 3 jours de course par semaine.')
  const hrMax = opt(num(f.hrMax, 120, 230), 'FC max : entre 120 et 230.')
  const hrRest = opt(num(f.hrRest, 30, 110), 'FC de repos : entre 30 et 110.')
  const thresholds = Object.fromEntries(
    (Object.keys(DEFAULT_THRESHOLDS) as (keyof Thresholds)[]).map((k) => [k, need(num(f.thresholds[k], 0, 60), `Repère « ${THRESHOLD_LABELS[k]} » invalide.`)]),
  ) as unknown as Thresholds
  if (errors.length > 0) return { ok: false, errors: [...new Set(errors)] }

  const raceChanged = !previous || previous.race.day !== f.day || previous.race.kind !== f.kind
  const days = [...new Set(f.days)].sort((a, b) => a - b)
  return {
    ok: true,
    weightKg,
    profile: {
      race: { name: f.name.trim(), day: f.day, kind: f.kind, goalSec },
      walkRun: f.walkRun,
      body: { heightCm, birthYear, sex: f.sex || null },
      level: { weeklyKm, longestKm, years, chrono },
      constraints: { days, longRunDay: days.includes(f.longRunDay) ? f.longRunDay : days[days.length - 1], gym: f.gym },
      health: { pains: f.pains.trim(), hrMax, hrRest },
      thresholds,
      // Date de course changée : plan régénéré à partir d'aujourd'hui, historique conservé.
      startedOn: raceChanged ? today : previous.startedOn,
      sickWeeks: previous?.sickWeeks ?? [],
    },
  }
}

export const THRESHOLD_LABELS: Record<keyof Thresholds, string> = {
  experiencedMinWeeks: 'Confirmé : minimum (semaines)',
  experiencedIdealWeeks: 'Confirmé : conseillé (semaines)',
  regularMinWeeks: 'Régulier : minimum (semaines)',
  beginnerMinWeeks: 'Débutant : minimum (semaines)',
  cautiousExtraWeeks: 'Prudent : semaines en plus',
  bmiCautious: 'IMC du mode prudent',
}
