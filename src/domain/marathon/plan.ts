/**
 * Générateur du plan marathon (lot 3), construit à rebours depuis la date de course. Jamais stocké : recalculé
 * à partir du profil, des sorties faites et du jour, donc automatiquement chaque lundi. Toutes les règles sont ici.
 */
import { addDays, daysBetween, weekStart } from '../date'
import type { Day } from '../types'
import { paces, type PaceKind, type Paces } from './paces'
import { isCautious, RACE_KM, runnerLevel, weekdayOf, type MarathonProfile, type RunnerLevel, type Weekday } from './profile'

export type Phase = 'base' | 'development' | 'specific' | 'taper'
export type RunKind = 'easy' | 'recovery' | 'long' | 'threshold' | 'intervals' | 'racePace' | 'walkRun' | 'cross' | 'race'

export const PHASE_LABELS: Record<Phase, string> = { base: 'Base', development: 'Développement', specific: 'Spécifique', taper: 'Affûtage' }
export const RUN_LABELS: Record<RunKind, string> = {
  easy: 'Footing facile',
  recovery: 'Récupération',
  long: 'Sortie longue',
  threshold: 'Seuil',
  intervals: 'Fractionné',
  racePace: 'Allure course',
  walkRun: 'Course-marche',
  cross: 'Vélo ou marche',
  race: 'Course',
}

/** Un bloc du minuteur d'intervalles. */
export interface Segment {
  label: string
  sec: number
  pace: PaceKind | 'walk'
}

export interface PlannedRun {
  day: Day
  kind: RunKind
  km: number
  /** Déroulé en une phrase (échauffement, répétitions, passages à allure…). */
  detail: string
  pace: PaceKind | null
  /** Blocs du minuteur (fractionné, seuil, course-marche) ; vide pour une sortie continue. */
  segments: Segment[]
  /** Km hors endurance facile (répétitions, seuil, allure course) : la règle des 80 % facile. */
  fastKm: number
}

type Draft = Omit<PlannedRun, 'fastKm'>

export interface PlannedStrength {
  day: Day
  light: boolean
}

export interface PlanWeek {
  index: number
  start: Day
  phase: Phase
  deload: boolean
  sick: boolean
  /** Km prévus (somme des sorties). */
  km: number
  longKm: number
  runs: PlannedRun[]
  strength: PlannedStrength[]
  /** Km faits : null pour une semaine à venir. */
  doneKm: number | null
}

/** Une sortie faite (séance sport avec le mouvement « course »). */
export interface DoneRun {
  day: Day
  km: number
  pain: number | null
}

export interface Plan {
  weeks: PlanWeek[]
  /** Semaine en cours (-1 avant le début, weeks.length après la course). */
  current: number
  level: RunnerLevel
  cautious: boolean
  walkRun: boolean
  paces: Paces
  /** Progression gelée par la douleur : la raison, sinon null. */
  frozen: string | null
  /** Messages d'adaptation de la semaine en cours. */
  alerts: string[]
}

/** Repères du générateur. */
export const RULES = {
  growth: 1.1,
  growthCautious: 1.05,
  deloadEvery: 4,
  deloadEveryCautious: 3,
  deload: 0.75,
  sick: 0.6,
  longCapKm: 32,
  longCapSec: 3 * 3600,
  halfLongCapKm: 18,
  halfLongCapSec: 2 * 3600,
  /** Volume des semaines d'affûtage avant celle de la course, en part du pic. */
  taper3: [0.6, 0.5],
  taper2: [0.55],
  /** Part maximale du temps hors endurance facile. */
  hardShare: 0.2,
  painMax: 3,
  /** Pas de musculation les 10 derniers jours. */
  noStrengthDays: 10,
}

const PEAK_KM: Record<'marathon' | 'half', Record<RunnerLevel, number>> = {
  marathon: { experienced: 70, regular: 50, beginner: 35 },
  half: { experienced: 50, regular: 38, beginner: 25 },
}
/** Allure de sortie longue supposée sans chrono (s/km), pour le plafond de 3 h. */
const DEFAULT_LONG_PACE: Record<RunnerLevel | 'walkRun', number> = { experienced: 345, regular: 390, beginner: 480, walkRun: 510 }

const round05 = (x: number) => Math.round(x * 2) / 2
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
const min = (s: number) => s * 60
const circular = (a: number, b: number) => Math.min(Math.abs(a - b), 7 - Math.abs(a - b))

/** Km faits par semaine (lundi → km). */
function doneByWeek(runs: DoneRun[]): Map<Day, { km: number; longest: number }> {
  const m = new Map<Day, { km: number; longest: number }>()
  for (const r of runs) {
    const w = weekStart(r.day)
    const cur = m.get(w) ?? { km: 0, longest: 0 }
    m.set(w, { km: cur.km + r.km, longest: Math.max(cur.longest, r.km) })
  }
  return m
}

/** Douleur : au-dessus de 3, ou présente 2 sorties de suite → progression gelée. */
export function painFreeze(runs: DoneRun[]): string | null {
  const recent = [...runs].filter((r) => r.pain !== null).sort((a, b) => (a.day < b.day ? 1 : -1))
  const [last, before] = recent
  if (!last) return null
  if (last.pain! > RULES.painMax)
    return `Douleur ${last.pain}/10 à la dernière sortie : progression gelée, séances dures remplacées par du vélo ou de la marche. Si elle persiste, consulte.`
  if (last.pain! > 0 && before && before.pain! > 0)
    return 'Douleur 2 sorties de suite : progression gelée, séances dures remplacées par du vélo ou de la marche. Si elle persiste, consulte.'
  return null
}

/** Jours de course de la semaine : la sortie longue, puis les autres les plus espacés possible. */
function pickDays(days: Weekday[], longDay: Weekday, count: number): Weekday[] {
  const chosen: Weekday[] = [longDay]
  const pool = days.filter((d) => d !== longDay)
  while (chosen.length < count && pool.length > 0) {
    let best = pool[0]
    let bestDist = -1
    for (const d of pool) {
      const dist = Math.min(...chosen.map((c) => circular(c, d)))
      if (dist > bestDist) {
        best = d
        bestDist = dist
      }
    }
    chosen.push(best)
    pool.splice(pool.indexOf(best), 1)
  }
  return chosen
}

interface WeekShape {
  start: Day
  phase: Phase
  deload: boolean
  sick: boolean
  frozen: boolean
  raceWeek: boolean
  /** Première semaine d'affûtage : la seule avec un renfo (léger). */
  firstTaper: boolean
  km: number
  longKm: number
}

interface Ctx {
  p: MarathonProfile
  level: RunnerLevel
  cautious: boolean
  walkRun: boolean
  paces: Paces
  raceKm: number
  peakKm: number
  /** Premier jour où l'on peut placer une séance (le plan démarre en cours de semaine). */
  from: Day
}

/** Blocs de course-marche : la part courue grandit avec les phases. */
function walkRunSegments(km: number, phase: Phase, paceSec: number): Segment[] {
  const [run, walk] = phase === 'base' ? [60, 60] : phase === 'development' ? [120, 60] : [240, 60]
  const reps = Math.max(1, Math.round((km * paceSec - min(10)) / (run + walk)))
  return [
    { label: 'Marche d’échauffement', sec: min(5), pace: 'walk' },
    ...Array.from({ length: reps }, () => [
      { label: 'Course', sec: run, pace: 'easy' as const },
      { label: 'Marche', sec: walk, pace: 'walk' as const },
    ]).flat(),
    { label: 'Marche de retour au calme', sec: min(5), pace: 'walk' },
  ]
}

function qualityRun(kind: 'threshold' | 'intervals' | 'racePace', w: WeekShape, c: Ctx): Omit<Draft, 'day'> {
  const raceLabel = c.p.race.kind === 'marathon' ? 'marathon' : 'semi'
  if (kind === 'threshold') {
    const [reps, work] = w.phase === 'specific' ? [3, 10] : w.deload || w.phase === 'taper' ? [2, 8] : [3, 8]
    return {
      kind,
      km: clamp(round05(w.km * 0.15), 6, 12),
      detail: `15 min facile, ${reps} × ${work} min au seuil (2 min de récup), 10 min facile`,
      pace: 'threshold',
      segments: [
        { label: 'Échauffement', sec: min(15), pace: 'easy' },
        ...Array.from({ length: reps }, () => [
          { label: 'Seuil', sec: min(work), pace: 'threshold' as const },
          { label: 'Récup', sec: min(2), pace: 'recovery' as const },
        ]).flat(),
        { label: 'Retour au calme', sec: min(10), pace: 'easy' },
      ],
    }
  }
  if (kind === 'intervals') {
    const reps = w.deload || w.phase === 'taper' ? 4 : w.phase === 'specific' ? 6 : 5
    return {
      kind,
      km: clamp(round05(w.km * 0.13), 5, 11),
      detail: `15 min facile, ${reps} × 3 min rapide (2 min de récup), 10 min facile`,
      pace: 'intervals',
      segments: [
        { label: 'Échauffement', sec: min(15), pace: 'easy' },
        ...Array.from({ length: reps }, () => [
          { label: 'Rapide', sec: min(3), pace: 'intervals' as const },
          { label: 'Récup', sec: min(2), pace: 'recovery' as const },
        ]).flat(),
        { label: 'Retour au calme', sec: min(10), pace: 'easy' },
      ],
    }
  }
  const km = w.phase === 'taper' ? clamp(round05(w.km * 0.15), 6, 10) : clamp(round05(w.km * 0.15), 8, 14)
  return {
    kind,
    km,
    detail: `1,5 km facile, ${(km - 3).toLocaleString('fr-FR')} km à allure ${raceLabel}, 1,5 km facile`,
    pace: 'marathon',
    segments: [],
  }
}

/** Part « dure » d'une sortie pour la règle des 80 % facile. */
const hardKm = (r: Omit<Draft, 'day'>, longMp: number) =>
  r.kind === 'threshold' ? r.km * 0.45 : r.kind === 'intervals' ? r.km * 0.35 : r.kind === 'racePace' ? r.km - 3 : r.kind === 'long' ? longMp : 0

/** Les séances d'une semaine : jours, types, km, puis le renfo. */
function weekSessions(w: WeekShape, c: Ctx): { runs: PlannedRun[]; strength: PlannedStrength[] } {
  const { p, level, walkRun, cautious } = c
  const days = [...new Set(p.constraints.days)].sort((a, b) => a - b)
  const longDay = days.includes(p.constraints.longRunDay) ? p.constraints.longRunDay : days[days.length - 1]
  const dayOf = (d: Weekday) => addDays(w.start, d)
  const raceDay = p.race.day
  const minEasy = walkRun ? 2 : 3
  const longPace = c.paces.secPerKm.long?.[1] ?? DEFAULT_LONG_PACE[walkRun ? 'walkRun' : level]

  // Semaine de la course : la course, et deux petits footings avant (pas la veille).
  if (w.raceWeek) {
    const raceWd = weekdayOf(raceDay)
    const shake = days.filter((d) => d < raceWd - 1 && dayOf(d) >= c.from).slice(-2)
    const easyKm = clamp(round05(c.peakKm * 0.1), 3, 6)
    const runs: Draft[] = [
      ...shake.map((d) => ({
        day: dayOf(d),
        kind: (walkRun ? 'walkRun' : 'easy') as RunKind,
        km: easyKm,
        detail: 'Footing très facile pour garder les jambes',
        pace: 'easy' as const,
        segments: walkRun ? walkRunSegments(easyKm, 'taper', longPace) : [],
      })),
      {
        day: raceDay,
        kind: 'race',
        km: c.raceKm,
        detail: p.race.name || 'Le jour J',
        pace: 'marathon',
        segments: walkRun ? walkRunSegments(c.raceKm, 'taper', longPace) : [],
      },
    ]
    return { runs: runs.map((r) => ({ ...r, fastKm: 0 })), strength: [] }
  }

  const maxRuns = Math.min(walkRun ? 4 : { experienced: 5, regular: 4, beginner: 3 }[level], cautious ? 4 : 5)
  const runDays = pickDays(days, longDay, Math.min(days.length, maxRuns)).filter((d) => dayOf(d) >= c.from)
  const hasLong = runDays.includes(longDay)

  // Séances de qualité : aucune en base, en course-marche, malade ou douleur ; une au plus en semaine allégée ou prudent.
  const qualityKinds: ('threshold' | 'intervals' | 'racePace')[] =
    walkRun || w.sick
      ? []
      : w.phase === 'development'
        ? ['threshold', 'intervals']
        : w.phase === 'specific'
          ? ['racePace', 'threshold']
          : w.phase === 'taper'
            ? ['racePace']
            : []
  let q = Math.min(qualityKinds.length, level === 'experienced' ? 2 : 1, w.deload || cautious ? 1 : 2)
  q = Math.max(0, Math.min(q, runDays.length - 2))
  // Jours de qualité : loin de la sortie longue, jamais la veille ni le lendemain, jamais deux jours de suite.
  const others = runDays.filter((d) => d !== longDay)
  const quality: Weekday[] = []
  const candidates = [...others].sort((a, b) => circular(b, longDay) - circular(a, longDay) || a - b)
  for (const d of candidates) {
    if (quality.length >= q) break
    if (hasLong && circular(d, longDay) <= 1) continue
    if (quality.some((x) => circular(x, d) <= 1)) continue
    quality.push(d)
  }

  const runs: Draft[] = []
  let longMp = 0
  if (hasLong) {
    const longKm = round05(w.longKm)
    longMp = !walkRun && !w.frozen && w.phase === 'specific' && !w.deload ? clamp(round05(longKm * 0.25), 3, 10) : 0
    runs.push({
      day: dayOf(longDay),
      kind: 'long',
      km: longKm,
      detail: walkRun
        ? 'Sortie longue en course-marche'
        : longMp > 0
          ? `Sortie longue dont ${longMp.toLocaleString('fr-FR')} km à allure course sur la fin`
          : 'Sortie longue, régulière et facile',
      pace: 'long',
      segments: walkRun ? walkRunSegments(longKm, w.phase, longPace) : [],
    })
  }
  const qRuns = quality.map((d, i) => ({ day: dayOf(d), ...qualityRun(qualityKinds[i], w, c) }))
  // Environ 80 % facile : on retire d'abord les passages à allure de la sortie longue, puis on raccourcit la qualité.
  const total = () => w.km
  const hard = () => qRuns.reduce((s, r) => s + hardKm(r, 0), 0) + longMp
  if (hard() > total() * RULES.hardShare) {
    longMp = 0
    if (runs[0]?.kind === 'long') runs[0] = { ...runs[0], detail: 'Sortie longue, régulière et facile' }
  }
  while (qRuns.length > 0 && hard() > total() * RULES.hardShare) qRuns.pop()
  runs.push(...qRuns)

  // Le reste en footings faciles (récupération le lendemain de la sortie longue), 3 km au moins, et
  // toujours 3 sorties dans la semaine.
  let easyDays = runDays.filter((d) => d !== longDay && !qRuns.some((r) => r.day === dayOf(d)))
  const rest = Math.max(0, w.km - runs.reduce((s, r) => s + r.km, 0))
  const keep = Math.max(0, 3 - runs.length)
  while (easyDays.length > keep && rest / easyDays.length < minEasy) easyDays = easyDays.slice(0, -1)
  // Un footing reste un footing : au plus 14 km (8 en course-marche), et pas plus de 60 % de la sortie longue.
  const maxEasy = walkRun ? 8 : clamp(round05(w.longKm * 0.6), minEasy, 14)
  // Demi-km par défaut, le reste sur le premier : la somme tombe juste.
  const each = Math.min(maxEasy, Math.max(walkRun ? 1.5 : 2, Math.floor((rest / Math.max(1, easyDays.length)) * 2) / 2))
  const extra = Math.max(0, Math.min(maxEasy - each, round05(rest - each * easyDays.length)))
  for (const [i, d] of easyDays.entries()) {
    const km = i === 0 ? each + extra : each
    const recovery = !walkRun && hasLong && d === (longDay + 1) % 7
    runs.push({
      day: dayOf(d),
      kind: walkRun ? 'walkRun' : w.frozen ? 'easy' : recovery ? 'recovery' : 'easy',
      km,
      detail: walkRun
        ? 'En aisance, en alternant course et marche'
        : recovery
          ? 'Très facile, pour récupérer de la sortie longue'
          : 'En aisance : tu peux parler en phrases',
      pace: recovery ? 'recovery' : 'easy',
      segments: walkRun ? walkRunSegments(km, w.phase, longPace) : [],
    })
  }
  // Douleur : les séances dures deviennent du vélo ou de la marche (sans impact, 0 km de course).
  if (w.frozen)
    for (const r of runs)
      if (r.kind === 'threshold' || r.kind === 'intervals' || r.kind === 'racePace')
        Object.assign(r, { kind: 'cross', km: 0, detail: 'Vélo ou marche, sans impact, 45 min faciles', pace: null, segments: [] })
  runs.sort((a, b) => (a.day < b.day ? -1 : 1))

  // Renfo : 2 en base et développement, 1 en spécifique, 1 légère au début de l'affûtage, aucune les 10 derniers jours.
  const want = w.sick ? 0 : w.phase === 'base' || w.phase === 'development' ? 2 : w.phase === 'specific' || w.firstTaper ? 1 : 0
  const lastStrength = addDays(raceDay, -(RULES.noStrengthDays + 1))
  const hardDay = (d: Day) => runs.some((r) => r.day === d && (r.kind === 'threshold' || r.kind === 'intervals' || r.kind === 'racePace'))
  // Jamais la veille d'une sortie longue ou d'une séance de qualité.
  const eve = (d: Day) => runs.some((r) => r.day === addDays(d, 1) && (r.kind === 'long' || r.kind === 'race' || hardDay(r.day)))
  const isLong = (d: Day) => runs.some((r) => r.day === d && r.kind === 'long')
  const allDays = days.map(dayOf).filter((d) => d >= c.from && d <= lastStrength)
  // D'abord après une séance dure (les jours faciles restent faciles), puis un jour de footing, puis un jour sans course.
  const order = [
    ...allDays.filter(hardDay),
    ...allDays.filter((d) => !hardDay(d) && runs.some((r) => r.day === d)),
    ...allDays.filter((d) => !runs.some((r) => r.day === d)),
  ]
  const strength: PlannedStrength[] = []
  for (const d of order) {
    if (strength.length >= want) break
    if (eve(d) || isLong(d) || strength.some((s) => s.day === d)) continue
    strength.push({ day: d, light: w.phase === 'taper' || w.deload })
  }
  strength.sort((a, b) => (a.day < b.day ? -1 : 1))
  return { runs: runs.map((r) => ({ ...r, fastKm: round05(hardKm(r, r.kind === 'long' ? longMp : 0)) })), strength }
}

export function generatePlan(p: MarathonProfile, weightKg: number | null, done: DoneRun[], today: Day): Plan {
  const level = runnerLevel(p.level)
  const cautious = isCautious(p, weightKg)
  const walkRun = p.walkRun || level === 'beginner'
  const pc = paces(p, today)
  const start = weekStart(p.startedOn)
  const n = Math.floor(daysBetween(start, weekStart(p.race.day)) / 7) + 1
  const current = Math.floor(daysBetween(start, weekStart(today)) / 7)
  const empty = { weeks: [], current, level, cautious, walkRun, paces: pc, frozen: null, alerts: [] }
  if (n <= 0) return empty

  const half = p.race.kind === 'half'
  const raceKm = RACE_KM[p.race.kind]
  const taper = half || n < 16 ? 2 : 3
  const m = Math.max(0, n - taper)
  const [bw, dw] = walkRun ? [0.5, 0.25] : [0.35, 0.3]
  const base = Math.round(m * bw)
  const dev = Math.round(m * dw)
  const phaseOf = (i: number): Phase => (i >= m ? 'taper' : i < base ? 'base' : i < base + dev ? 'development' : 'specific')

  const peakKm = Math.max(PEAK_KM[p.race.kind][walkRun ? 'beginner' : level], Math.min(p.level.weeklyKm, 90))
  const startKm = Math.max(walkRun ? 8 : 12, Math.min(p.level.weeklyKm, peakKm))
  const longPace = pc.secPerKm.long?.[1] ?? DEFAULT_LONG_PACE[walkRun ? 'walkRun' : level]
  const longCap = half ? Math.min(RULES.halfLongCapKm, RULES.halfLongCapSec / longPace) : Math.min(RULES.longCapKm, RULES.longCapSec / longPace)
  const longStart = clamp(Math.min(p.level.longestKm, startKm * 0.5), walkRun ? 3 : 5, longCap)
  const inc = cautious ? 1.5 : level === 'experienced' ? 2.5 : 2
  const growth = cautious ? RULES.growthCautious : RULES.growth
  const deloadEvery = cautious ? RULES.deloadEveryCautious : RULES.deloadEvery
  const peakWeek = n - 4
  const ctx: Ctx = { p, level, cautious, walkRun, paces: pc, raceKm, peakKm, from: p.startedOn }

  const byWeek = doneByWeek(done)
  const freeze = painFreeze(done)
  const alerts: string[] = []
  const weeks: PlanWeek[] = []
  let build = startKm
  let long = longStart
  let missed = 0
  let lastGood = { km: startKm, long: longStart }
  let topKm = 0
  let topLong = 0

  for (let i = 0; i < n; i++) {
    const wStart = addDays(start, 7 * i)
    const phase = phaseOf(i)
    const sick = p.sickWeeks.includes(wStart)
    const frozen = freeze !== null && i === current
    const deload = phase !== 'taper' && (i + 1) % deloadEvery === 0 && i < peakWeek
    // Pas de progression pendant une semaine allégée : elle part du volume d'avant, la suivante aussi.
    let grow = i > 0 && !frozen && !deload && !sick

    // Adaptation : la semaine d'avant est passée, on part de ce qui a vraiment été fait.
    if (i > 0 && i - 1 < current) {
      const prev = weeks[i - 1]
      const did = byWeek.get(prev.start) ?? { km: 0, longest: 0 }
      if (prev.phase !== 'taper') {
        if (did.km < prev.km * 0.5) missed++
        else {
          missed = 0
          if (!prev.deload && !prev.sick) {
            lastGood = { km: did.km, long: Math.max(did.longest, longStart) }
            build = Math.min(build, Math.max(did.km, startKm * 0.7))
          }
        }
        if (missed >= 2) {
          build = Math.max(walkRun ? 8 : 10, lastGood.km * 0.7)
          long = Math.max(walkRun ? 3 : 5, Math.min(long, lastGood.long * 0.7))
          grow = false
          if (i === current) alerts.push('Plus d’une semaine manquée : le volume redescend avant de remonter.')
        } else if (missed === 1) {
          grow = false
          if (i === current) alerts.push('Semaine manquée : on ne la rattrape pas, on reprend le plan au même volume.')
        }
      }
    }

    let shape: WeekShape
    if (phase === 'taper') {
      const t = i - m
      const ratios = taper === 3 ? RULES.taper3 : RULES.taper2
      const raceWeek = i === n - 1
      shape = {
        start: wStart,
        phase,
        deload: false,
        sick,
        frozen,
        raceWeek,
        firstTaper: t === 0,
        km: raceWeek ? 0 : round05(topKm * ratios[t]),
        longKm: raceWeek ? 0 : round05(topLong * (t === 0 ? 0.6 : 0.45)),
      }
    } else {
      if (grow) {
        build = Math.min(peakKm, build * growth)
        long = Math.min(longCap, long + inc)
      }
      // Sortie longue : 45 % de la semaine à petit volume (3 sorties équilibrées), 55 % ensuite ; après le pic, elle redescend.
      // L'accumulateur suit la part retenue : la sortie longue ne prend jamais plus de +1,5 à 3 km d'un coup.
      long = Math.min(long, build * (build < 25 ? 0.45 : 0.55))
      let wLong = long
      if (i > peakWeek && peakWeek >= 0) wLong = Math.min(wLong, topLong * 0.7)
      const factor = sick ? RULES.sick : deload ? RULES.deload : 1
      shape = { start: wStart, phase, deload, sick, frozen, raceWeek: false, firstTaper: false, km: round05(build * factor), longKm: round05(wLong * factor) }
    }
    const { runs, strength } = weekSessions(shape, ctx)
    // Le volume prévu est celui des sorties réellement placées (jours disponibles, footings plafonnés).
    const km = Math.round(runs.reduce((s, r) => s + r.km, 0) * 10) / 10
    const longKm = Math.max(0, ...runs.filter((r) => r.kind === 'long').map((r) => r.km))
    if (phase !== 'taper' && !deload && !sick) {
      // La suite progresse depuis ce qui est vraiment prévu (jours disponibles, footings plafonnés).
      if (!frozen) build = Math.min(build, km)
      topKm = Math.max(topKm, km)
      if (i <= peakWeek || peakWeek < 0) topLong = Math.max(topLong, longKm)
    }
    const did = byWeek.get(wStart)
    weeks.push({
      index: i,
      start: wStart,
      phase,
      deload,
      sick,
      km,
      longKm,
      runs,
      strength,
      doneKm: i <= current ? Math.round((did?.km ?? 0) * 10) / 10 : null,
    })
  }
  if (current >= 0 && current < n && weeks[current].sick) alerts.push('Semaine déclarée malade : elle est allégée, sans séance dure ni renfo.')
  return { weeks, current, level, cautious, walkRun, paces: pc, frozen: current >= 0 && current < n ? freeze : null, alerts }
}

/** Ce qui est prévu un jour donné. */
export function plannedOn(plan: Plan, day: Day): { runs: PlannedRun[]; strength: PlannedStrength[] } {
  const w = plan.weeks.find((x) => day >= x.start && day <= addDays(x.start, 6))
  return { runs: w?.runs.filter((r) => r.day === day) ?? [], strength: w?.strength.filter((s) => s.day === day) ?? [] }
}
