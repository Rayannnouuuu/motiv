/**
 * Générateur du plan marathon (lot 3), construit à rebours depuis la date de course. Jamais stocké : recalculé
 * à partir du profil, des sorties faites et du jour, donc automatiquement chaque lundi. Toutes les règles sont ici.
 */
import { addDays, daysBetween, weekStart } from '../date'
import type { Day } from '../types'
import { paces, typicalPace, type PaceKind, type Paces } from './paces'
import { RUNNER_TEMPLATE_ID } from './strength'
import { isCautious, RACE_KM, runnerLevel, weekdayOf, type MarathonProfile, type RaceKind, type RunnerLevel, type Weekday } from './profile'

export type Phase = 'base' | 'development' | 'specific' | 'taper'
export type RunKind = 'easy' | 'recovery' | 'long' | 'threshold' | 'intervals' | 'hills' | 'fartlek' | 'racePace' | 'test' | 'walkRun' | 'cross' | 'race'

export const PHASE_LABELS: Record<Phase, string> = { base: 'Base et vitesse', development: 'Développement', specific: 'Spécifique', taper: 'Affûtage' }
export const RUN_LABELS: Record<RunKind, string> = {
  easy: 'Footing facile',
  recovery: 'Récupération',
  long: 'Sortie longue',
  threshold: 'Seuil',
  intervals: 'Fractionné',
  hills: 'Côtes',
  fartlek: 'Fartlek',
  racePace: 'Allure course',
  test: 'Test 5 km',
  walkRun: 'Course-marche',
  cross: 'Vélo ou marche',
  race: 'Course',
}

/** Les séances dures : jamais deux jours de suite ni collées à la sortie longue, jamais de jambes la veille. */
export const HARD_KINDS: ReadonlySet<RunKind> = new Set<RunKind>(['threshold', 'intervals', 'hills', 'fartlek', 'racePace', 'test'])

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

/** Une séance de muscu du plan : le renfo coureur, ou une séance de ta rotation une fois combinée (combined.ts). */
export interface PlannedStrength {
  day: Day
  light: boolean
  /** Modèle de séance à lancer. */
  programId: string
  name: string
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
  /** Durée en secondes, quand on la connaît : elle sert à caler les allures sur tes sorties. */
  sec?: number
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
  /** Part du volume prévu faite la semaine d'avant : sous 50 %, semaine manquée. */
  missedBelow: 0.5,
  /** Sous 70 %, le plan repart de ce qui a été couru. */
  heldBelow: 0.7,
  /** À partir de 85 %, la semaine est tenue : la progression continue. Entre les deux, on garde le même volume. */
  keptAt: 0.85,
  /** Une sortie ne dépasse jamais de plus de 10 % la plus longue du dernier mois : ce sont ces pics qui blessent. */
  spikeMax: 1.1,
  /** Jamais plus léger : 20 km par semaine au départ (14 en course-marche), sortie longue de 6 km, aucune sortie sous 4 km. */
  minStartKm: 20,
  minStartKmWalkRun: 14,
  minLongKm: 6,
  minEasyKm: 4,
  /** Un test sur 5 km toutes les 6 semaines (base et développement) : ton temps recale les allures. */
  testEvery: 6,
  /** Plan long : le bloc marathon (7 semaines de développement, 8 de spécifique) ; avant, un bloc vitesse. */
  devWeeks: 7,
  specificWeeks: 8,
  /** Plan long : le volume suit une rampe de 70 % du pic au départ jusqu'au pic au début du spécifique (pas de plateau de plusieurs mois). */
  rampFrom: 0.7,
}

const PEAK_KM: Record<'marathon' | 'half', Record<RunnerLevel, number>> = {
  marathon: { experienced: 85, regular: 65, beginner: 45 },
  half: { experienced: 62, regular: 48, beginner: 32 },
}
/** Allure de sortie longue supposée sans chrono (s/km), pour le plafond de 3 h. */
const DEFAULT_LONG_PACE: Record<RunnerLevel | 'walkRun', number> = { experienced: 345, regular: 390, beginner: 480, walkRun: 510 }

const round05 = (x: number) => Math.round(x * 2) / 2
const floor05 = (x: number) => Math.floor(x * 2) / 2
const fr = (x: number) => x.toLocaleString('fr-FR')
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
  index: number
  /** Avancée dans le programme : 0 au départ, 1 au pic. Les séances progressent avec elle. */
  t: number
  /** Avancée dans la phase : 0 à son début, 1 à sa fin. */
  pt: number
  /** Semaine de test sur 5 km. */
  test: boolean
  /** Plafond de la sortie longue cette semaine : +10 % sur la plus longue du dernier mois. */
  longMax?: number
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

type QualityKind = 'threshold' | 'intervals' | 'hills' | 'fartlek' | 'racePace' | 'test'

/** Les séances progressent avec le programme (dernier cran atteint vers la fin du développement) ; deux crans de moins en semaine allégée ou en affûtage. */
function step<T>(steps: T[], w: WeekShape): T {
  const i = Math.min(steps.length - 1, Math.floor((w.t / 0.85) * steps.length))
  return steps[Math.max(0, w.deload || w.phase === 'taper' ? i - 2 : i)]
}
/** Seuil : répétitions × minutes, jusqu'à 25 min d'affilée. */
const THRESHOLD: [number, number][] = [
  [3, 8],
  [4, 8],
  [3, 10],
  [3, 12],
  [2, 15],
  [2, 18],
  [1, 25],
]
/** Fractionné : répétitions × mètres, de 8 × 400 m à 6 × 1000 m. */
const INTERVALS: [number, number][] = [
  [8, 400],
  [10, 400],
  [6, 600],
  [8, 600],
  [5, 800],
  [6, 800],
  [5, 1000],
  [6, 1000],
]
/** Côtes : répétitions × secondes. */
const HILLS: [number, number][] = [
  [6, 45],
  [8, 45],
  [10, 45],
  [8, 60],
  [10, 60],
]
/** Fartlek : répétitions, secondes vite, secondes lent. */
const FARTLEK: [number, number, number][] = [
  [10, 60, 60],
  [12, 60, 60],
  [8, 120, 60],
  [10, 120, 60],
  [6, 180, 90],
]
const dur = (sec: number) => (sec < 60 ? `${sec} s` : sec % 60 ? `${Math.floor(sec / 60)} min ${String(sec % 60).padStart(2, '0')}` : `${sec / 60} min`)
const WARM: Segment = { label: 'Échauffement', sec: 15 * 60, pace: 'easy' }
const COOL: Segment = { label: 'Retour au calme', sec: 10 * 60, pace: 'easy' }
const repeat = (n: number, blocks: (i: number) => Segment[]) => Array.from({ length: n }, (_, i) => blocks(i)).flat()

/** Une séance dure de la semaine. `km` : la distance choisie (sortie ajoutée à la main), sinon celle du plan. */
function qualityRun(kind: QualityKind, w: WeekShape, raceKind: RaceKind, intervalsPace: number, km?: number): Omit<Draft, 'day'> {
  const raceLabel = raceKind === 'marathon' ? 'marathon' : 'semi'
  switch (kind) {
    case 'threshold': {
      const [reps, work] = step(THRESHOLD, w)
      const blocks = reps === 1 ? `${work} min au seuil` : `${reps} × ${work} min au seuil (2 min de récup)`
      return {
        kind,
        km: km ?? clamp(round05(w.km * 0.15), 6, 13),
        detail: `15 min facile, ${blocks}, 10 min facile`,
        pace: 'threshold',
        segments: [
          WARM,
          ...repeat(reps, (i) => [
            { label: 'Seuil', sec: work * 60, pace: 'threshold' },
            ...(i < reps - 1 ? [{ label: 'Récup', sec: 120, pace: 'recovery' } as const] : []),
          ]),
          COOL,
        ],
      }
    }
    case 'intervals': {
      const [reps, m] = step(INTERVALS, w)
      const sec = Math.round(((m / 1000) * intervalsPace) / 5) * 5
      const rest = Math.max(60, Math.round((sec * 0.6) / 15) * 15)
      return {
        kind,
        km: km ?? clamp(round05(w.km * 0.13), 5, 11),
        detail: `15 min facile, ${reps} × ${m} m vite (${dur(rest)} de récup en trottinant), 10 min facile`,
        pace: 'intervals',
        segments: [
          WARM,
          ...repeat(reps, () => [
            { label: `${m} m vite`, sec, pace: 'intervals' },
            { label: 'Récup', sec: rest, pace: 'recovery' },
          ]),
          COOL,
        ],
      }
    }
    case 'hills': {
      const [reps, sec] = step(HILLS, w)
      return {
        kind,
        km: km ?? clamp(round05(w.km * 0.13), 5, 9),
        detail: `15 min facile, ${reps} × ${dur(sec)} en côte, fort (récup en redescendant au trot), 10 min facile`,
        pace: 'intervals',
        segments: [
          WARM,
          ...repeat(reps, () => [
            { label: 'Côte', sec, pace: 'intervals' },
            { label: 'Redescente', sec: sec * 2, pace: 'recovery' },
          ]),
          COOL,
        ],
      }
    }
    case 'fartlek': {
      const [reps, fast, slow] = step(FARTLEK, w)
      return {
        kind,
        km: km ?? clamp(round05(w.km * 0.14), 5, 10),
        detail: `15 min facile, ${reps} × ${dur(fast)} vite / ${dur(slow)} lent, 10 min facile`,
        pace: 'intervals',
        segments: [
          WARM,
          ...repeat(reps, () => [
            { label: 'Vite', sec: fast, pace: 'intervals' },
            { label: 'Lent', sec: slow, pace: 'easy' },
          ]),
          COOL,
        ],
      }
    }
    case 'test':
      return {
        kind,
        km: 5,
        detail: 'Échauffe-toi 15 min avant de lancer le chrono, puis 5 km le plus vite possible, régulier : ton temps recale toutes tes allures',
        pace: null,
        segments: [],
      }
    case 'racePace': {
      // De 6 à 14 km à allure course au fil du spécifique.
      const mp = km !== undefined ? Math.max(1, km - 3) : w.phase === 'taper' ? 5 : w.deload ? 6 : round05(6 + 8 * w.pt)
      return { kind, km: mp + 3, detail: `1,5 km facile, ${fr(mp)} km à allure ${raceLabel}, 1,5 km facile`, pace: 'marathon', segments: [] }
    }
  }
}

/** Part « dure » d'une sortie pour la règle des 80 % facile. */
const HARD_SHARE: Partial<Record<RunKind, number>> = { threshold: 0.45, intervals: 0.35, fartlek: 0.3, hills: 0.2, test: 1 }
const hardKm = (r: Omit<Draft, 'day'>, longMp: number) => (r.kind === 'racePace' ? r.km - 3 : r.kind === 'long' ? longMp : r.km * (HARD_SHARE[r.kind] ?? 0))

/** Les séances d'une semaine : jours, types, km, puis le renfo. */
function weekSessions(w: WeekShape, c: Ctx): { runs: PlannedRun[]; strength: PlannedStrength[] } {
  const { p, level, walkRun, cautious } = c
  const dayOf = (d: Weekday) => addDays(w.start, d)
  // Jours indisponibles de cette semaine : ni course ni renfo ; la sortie longue va sur le dernier jour libre.
  const off = new Set(p.offDays ?? [])
  const days = [...new Set(p.constraints.days)].filter((d) => !off.has(dayOf(d)) || dayOf(d) === p.race.day).sort((a, b) => a - b)
  if (days.length === 0) return { runs: [], strength: [] }
  const longDay = days.includes(p.constraints.longRunDay) ? p.constraints.longRunDay : days[days.length - 1]
  const raceDay = p.race.day
  const longPace = c.paces.secPerKm.long?.[1] ?? DEFAULT_LONG_PACE[walkRun ? 'walkRun' : level]

  // Semaine de la course : la course, et deux petits footings avant (pas la veille).
  if (w.raceWeek) {
    const raceWd = weekdayOf(raceDay)
    const shake = days.filter((d) => d < raceWd - 1 && dayOf(d) >= c.from).slice(-2)
    const easyKm = clamp(round05(c.peakKm * 0.1), RULES.minEasyKm, 6)
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

  const maxRuns = Math.min(walkRun ? 4 : { experienced: 5, regular: 5, beginner: 4 }[level], cautious ? 4 : 5)
  const runDays = pickDays(days, longDay, Math.min(days.length, maxRuns)).filter((d) => dayOf(d) >= c.from)
  const hasLong = runDays.includes(longDay)
  const easySec = c.paces.secPerKm.easy?.[1] ?? longPace
  const intervalsSec = c.paces.secPerKm.intervals?.[0] ?? Math.round(longPace * 0.78)

  // Séances dures : dès la base (vitesse en base, seuil et fractionné en développement, allure course et seuil en
  // spécifique), deux par semaine à partir de 30 km. Une seule sous 30 km, en semaine allégée, en mode prudent, les 2
  // premières semaines et la semaine du test ; aucune en course-marche ou malade.
  const speed: QualityKind = (['hills', 'fartlek', 'intervals'] as const)[w.index % 3]
  const qualityKinds: QualityKind[] =
    walkRun || w.sick
      ? []
      : w.phase === 'base'
        ? [speed, 'threshold']
        : w.phase === 'development'
          ? ['threshold', 'intervals']
          : w.phase === 'specific'
            ? ['racePace', 'threshold']
            : ['racePace']
  if (w.test && qualityKinds.length > 0) qualityKinds[0] = 'test'
  let q = Math.min(qualityKinds.length, w.deload || cautious || w.test || w.index < 2 || w.km < 30 ? 1 : 2)
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

  // Environ 80 % facile : les séances dures dans l'ordre (l'allure course raccourcie s'il le faut), puis les km à allure
  // course sur la fin de la sortie longue, avec ce qui reste. Le test 5 km (seul, toutes les 6 semaines) est à part.
  let budget = w.km * RULES.hardShare
  const qRuns: Draft[] = []
  for (const [i, d] of quality.entries()) {
    let r: Draft = { day: dayOf(d), ...qualityRun(qualityKinds[i], w, p.race.kind, intervalsSec) }
    if (r.kind === 'racePace' && hardKm(r, 0) > budget && budget >= 5)
      r = { day: r.day, ...qualityRun('racePace', w, p.race.kind, intervalsSec, floor05(budget) + 3) }
    const h = r.kind === 'test' ? 0 : hardKm(r, 0)
    if (h > budget + 1e-9) continue
    qRuns.push(r)
    budget -= h
  }
  const qKm = qRuns.reduce((s, r) => s + r.km, 0)

  // Le reste en footings faciles (récupération le lendemain de la sortie longue), et toujours 3 sorties dans la semaine.
  // Des footings qui comptent : 6 km dès 30 km par semaine ; la sortie longue cède la place qu'il faut, jusqu'à 40 % de la semaine.
  let easyDays = runDays.filter((d) => d !== longDay && !qRuns.some((r) => r.day === dayOf(d)))
  const minEasy = walkRun ? RULES.minEasyKm : clamp(round05(w.km * 0.2), RULES.minEasyKm, 6)
  const longTarget = Math.min(round05(w.longKm), w.longMax ?? Infinity)
  let longKm = hasLong ? longTarget : 0
  if (hasLong && !walkRun && easyDays.length > 0) longKm = Math.min(longKm, Math.max(round05(w.km * 0.4), floor05(w.km - qKm - minEasy * easyDays.length)))
  const longMpWanted = !walkRun && !w.frozen && w.phase === 'specific' && !w.deload ? clamp(round05(longKm * (0.15 + 0.2 * w.pt)), 3, 12) : 0
  let longMp = Math.min(longMpWanted, floor05(budget)) >= 3 ? Math.min(longMpWanted, floor05(budget)) : 0

  const runs: Draft[] = []
  if (hasLong)
    runs.push({
      day: dayOf(longDay),
      kind: 'long',
      km: longKm,
      detail: walkRun
        ? 'Sortie longue en course-marche'
        : longMp > 0
          ? `Sortie longue dont ${fr(longMp)} km à allure course sur la fin`
          : 'Sortie longue, régulière et facile',
      pace: 'long',
      segments: walkRun ? walkRunSegments(longKm, w.phase, longPace) : [],
    })
  runs.push(...qRuns)

  const rest = Math.max(0, w.km - runs.reduce((s, r) => s + r.km, 0))
  const keep = Math.max(0, 3 - runs.length)
  while (easyDays.length > keep && rest / easyDays.length < minEasy) easyDays = easyDays.slice(0, -1)
  // Sortie longue plafonnée par la règle des +10 % : ses km vont aux footings, sans dépasser le même plafond.
  // Sinon un footing reste un footing : au plus 14 km, jamais plus long que la sortie longue, 60 % de celle-ci ou 30 % de la semaine.
  const maxEasy =
    w.longMax !== undefined
      ? Math.min(walkRun ? 8 : 14, w.longMax)
      : walkRun
        ? 8
        : Math.max(minEasy, Math.min(14, round05(w.longKm), round05(Math.max(w.longKm * 0.6, w.km * 0.3))))
  // Demi-km par défaut, le reste sur le premier : la somme tombe juste.
  const each = Math.min(maxEasy, Math.max(RULES.minEasyKm, Math.floor((rest / Math.max(1, easyDays.length)) * 2) / 2))
  const extra = Math.max(0, Math.min(maxEasy - each, round05(rest - each * easyDays.length)))
  // Accélérations à la fin d'un footing par semaine (pas celui du lendemain de la sortie longue).
  let strides = !walkRun && !w.frozen && !w.sick
  for (const [i, d] of easyDays.entries()) {
    const km = i === 0 ? each + extra : each
    const recovery = !walkRun && hasLong && d === (longDay + 1) % 7
    const withStrides = strides && !recovery
    if (withStrides) strides = false
    runs.push({
      day: dayOf(d),
      kind: walkRun ? 'walkRun' : w.frozen ? 'easy' : recovery ? 'recovery' : 'easy',
      km,
      detail: walkRun
        ? 'En aisance, en alternant course et marche'
        : recovery
          ? 'Très facile, pour récupérer de la sortie longue'
          : withStrides
            ? 'En aisance, puis 6 accélérations de 20 s (1 min de trot entre chaque)'
            : 'En aisance : tu peux parler en phrases',
      pace: recovery ? 'recovery' : 'easy',
      segments: walkRun
        ? walkRunSegments(km, w.phase, longPace)
        : withStrides
          ? [
              { label: 'Footing', sec: Math.round(km * easySec), pace: 'easy' },
              ...repeat(6, () => [
                { label: 'Accélération', sec: 20, pace: 'intervals' },
                { label: 'Trot', sec: 60, pace: 'recovery' },
              ]),
            ]
          : [],
    })
  }
  // Un footing en moins (volume trop faible pour 6 km) : ses km reviennent à la sortie longue, jusqu'à sa distance prévue.
  const long = runs.find((r) => r.kind === 'long')
  const missing = floor05(w.km - runs.reduce((s, r) => s + r.km, 0))
  if (long && !walkRun && missing > 0) long.km += Math.max(0, Math.min(missing, longTarget - long.km))
  // Les footings plafonnés peuvent laisser la semaine sous sa cible : la règle des 80 % facile se vérifie sur ce qui est
  // vraiment prévu. D'abord plus d'allure course dans la sortie longue, puis la dernière séance dure devient un footing.
  const hardTotal = () => runs.reduce((s, r) => s + (r.kind === 'test' ? 0 : hardKm(r, r.kind === 'long' ? longMp : 0)), 0)
  const kmTotal = () => runs.reduce((s, r) => s + r.km, 0)
  while (hardTotal() > kmTotal() * RULES.hardShare + 1e-9) {
    if (longMp > 0 && long) {
      longMp = 0
      long.detail = 'Sortie longue, régulière et facile'
      continue
    }
    const last = [...runs].reverse().find((r) => HARD_KINDS.has(r.kind) && r.kind !== 'test')
    if (!last) break
    Object.assign(last, { kind: 'easy', detail: 'En aisance : tu peux parler en phrases', pace: 'easy', segments: [] })
  }
  // Douleur : les séances dures deviennent du vélo ou de la marche (sans impact, 0 km de course).
  if (w.frozen)
    for (const r of runs)
      if (HARD_KINDS.has(r.kind)) Object.assign(r, { kind: 'cross', km: 0, detail: 'Vélo ou marche, sans impact, 45 min faciles', pace: null, segments: [] })
  runs.sort((a, b) => (a.day < b.day ? -1 : 1))

  // Renfo : 2 en base et développement, 1 en spécifique, 1 légère au début de l'affûtage, aucune les 10 derniers jours.
  const want = w.sick ? 0 : w.phase === 'base' || w.phase === 'development' ? 2 : w.phase === 'specific' || w.firstTaper ? 1 : 0
  const lastStrength = addDays(raceDay, -(RULES.noStrengthDays + 1))
  const hardDay = (d: Day) => runs.some((r) => r.day === d && HARD_KINDS.has(r.kind))
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
    strength.push({ day: d, light: w.phase === 'taper' || w.deload, programId: RUNNER_TEMPLATE_ID, name: 'Renfo coureur' })
  }
  strength.sort((a, b) => (a.day < b.day ? -1 : 1))
  return { runs: runs.map((r) => ({ ...r, fastKm: round05(hardKm(r, r.kind === 'long' ? longMp : 0)) })), strength }
}

/** Avancée d'une semaine : dans le programme (0 → 1 au pic, 3 semaines avant la course) et dans sa phase (0 → 1). */
function progress(phases: Phase[], i: number): { t: number; pt: number } {
  let a = i
  let b = i
  while (a > 0 && phases[a - 1] === phases[i]) a--
  while (b < phases.length - 1 && phases[b + 1] === phases[i]) b++
  return { t: clamp(i / Math.max(1, phases.length - 4), 0, 1), pt: b > a ? (i - a) / (b - a) : 1 }
}

export function generatePlan(p: MarathonProfile, weightKg: number | null, done: DoneRun[], today: Day): Plan {
  const level = runnerLevel(p.level)
  const cautious = isCautious(p, weightKg)
  const walkRun = p.walkRun || level === 'beginner'
  const pc = paces(p, today, typicalPace(done, today))
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
  // Plan long : le bloc marathon (développement puis spécifique) garde sa durée, tout ce qui précède est un bloc vitesse.
  const longPlan = !walkRun && m >= RULES.devWeeks + RULES.specificWeeks + 8
  const base = longPlan ? m - RULES.devWeeks - RULES.specificWeeks : Math.round(m * bw)
  const dev = longPlan ? RULES.devWeeks : Math.round(m * dw)
  const phaseOf = (i: number): Phase => (i >= m ? 'taper' : i < base ? 'base' : i < base + dev ? 'development' : 'specific')
  const phases = Array.from({ length: n }, (_, i) => phaseOf(i))

  const peakKm = Math.max(PEAK_KM[p.race.kind][walkRun ? 'beginner' : level], Math.min(p.level.weeklyKm, 90))
  // Rampe du plan long : le pic est atteint au début du spécifique, pas des mois avant.
  const ramp = (i: number) => (longPlan ? peakKm * (RULES.rampFrom + (1 - RULES.rampFrom) * Math.min(1, i / Math.max(1, base + dev))) : Infinity)
  const startKm = Math.max(walkRun ? RULES.minStartKmWalkRun : RULES.minStartKm, Math.min(p.level.weeklyKm, peakKm))
  const longPace = pc.secPerKm.long?.[1] ?? DEFAULT_LONG_PACE[walkRun ? 'walkRun' : level]
  const longCap = half ? Math.min(RULES.halfLongCapKm, RULES.halfLongCapSec / longPace) : Math.min(RULES.longCapKm, RULES.longCapSec / longPace)
  const longStart = clamp(Math.min(p.level.longestKm, startKm * 0.5), RULES.minLongKm, longCap)
  const inc = cautious ? 1.5 : level === 'experienced' ? 2.5 : 2
  const growth = cautious ? RULES.growthCautious : RULES.growth
  const deloadEvery = cautious ? RULES.deloadEveryCautious : RULES.deloadEvery
  const peakWeek = n - 4
  const ctx: Ctx = { p, level, cautious, walkRun, paces: pc, raceKm, peakKm, from: p.startedOn }

  const byWeek = doneByWeek(done)
  const freeze = painFreeze(done)
  // Pas de pic sur une seule sortie : la plus longue des 30 jours avant la semaine, +10 % au plus (semaines passées et en cours).
  const monthLongest = (from: Day) => Math.max(0, ...done.filter((r) => r.day >= addDays(from, -30) && r.day < from).map((r) => r.km))
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
        const ratio = prev.km > 0 ? did.km / prev.km : 1
        if (ratio < RULES.missedBelow) missed++
        else {
          missed = 0
          if (!prev.deload && !prev.sick) {
            lastGood = { km: did.km, long: Math.max(did.longest, longStart) }
            // Une semaine tenue à 85 % ou plus compte comme tenue : le plan continue sa progression. Avant, il repartait de ce
            // qui avait été couru, donc 90 % de réalisation le bloquait au même volume pour toujours.
            if (ratio < RULES.heldBelow) build = Math.min(build, Math.max(did.km, startKm * 0.7))
            else if (ratio < RULES.keptAt) {
              grow = false
              if (i === current) alerts.push('Semaine presque tenue : on garde le même volume avant de monter.')
            }
          }
        }
        if (missed >= 2) {
          build = Math.max(walkRun ? RULES.minStartKmWalkRun : 14, lastGood.km * 0.7)
          long = Math.max(RULES.minLongKm, Math.min(long, lastGood.long * 0.7))
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
        index: i,
        ...progress(phases, i),
        test: false,
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
        // +10 % au plus, et pas plus vite que la rampe du plan long (sans jamais redescendre à cause d'elle).
        build = Math.min(peakKm, Math.max(build, Math.min(build * growth, ramp(i))))
        // Sortie longue : +10 % au plus d'une semaine de charge à l'autre (et +1,5 à 2,5 km au plus).
        long = Math.min(longCap, long + Math.min(inc, Math.max(1, long * (RULES.spikeMax - 1))))
      }
      // Sortie longue : 45 % de la semaine sous 30 km, 42 % au-delà ; après le pic, elle redescend.
      long = Math.min(long, build * (build < 30 ? 0.45 : 0.42))
      let wLong = long
      if (i > peakWeek && peakWeek >= 0) wLong = Math.min(wLong, topLong * 0.7)
      const factor = sick ? RULES.sick : deload ? RULES.deload : 1
      const test = !walkRun && !sick && (phase === 'base' || phase === 'development') && i % RULES.testEvery === RULES.testEvery - 1
      shape = {
        index: i,
        ...progress(phases, i),
        test,
        start: wStart,
        phase,
        deload,
        sick,
        frozen,
        raceWeek: false,
        firstTaper: false,
        km: round05(build * factor),
        longKm: round05(sick ? wLong * factor : Math.max(RULES.minLongKm, wLong * factor)),
      }
      const longest = i <= current ? monthLongest(wStart) : 0
      if (longest > 0) {
        const cap = Math.max(RULES.minLongKm, round05(longest * RULES.spikeMax))
        if (shape.longKm > cap) {
          shape.longMax = cap
          if (i === current)
            alerts.push(
              `Ta plus longue sortie du dernier mois : ${fr(round05(longest))} km. Cette semaine, aucune sortie ne dépasse ${fr(cap)} km (+10 % au plus) : ce sont les hausses brutales qui blessent.`,
            )
        }
      }
    }
    const { runs, strength } = weekSessions(shape, ctx)
    // Le volume prévu est celui des sorties réellement placées (jours disponibles, footings plafonnés).
    const km = Math.round(runs.reduce((s, r) => s + r.km, 0) * 10) / 10
    const longKm = Math.max(0, ...runs.filter((r) => r.kind === 'long').map((r) => r.km))
    if (phase !== 'taper' && !deload && !sick) {
      // La suite progresse depuis ce qui est vraiment prévu (jours disponibles, footings plafonnés).
      // Une semaine raccourcie par des jours indisponibles ne fait pas baisser la suite.
      const limited = (p.offDays ?? []).some((d) => d >= wStart && d <= addDays(wStart, 6))
      // Une semaine plafonnée par la règle des +10 % ne fait pas baisser la suite : le plafond se recalcule chaque semaine.
      if (!frozen && !limited && shape.longMax === undefined) build = Math.min(build, km)
      // La suite de la sortie longue part de celle vraiment prévue (raccourcie pour les footings, ou plafonnée) : +10 % au plus.
      if (longKm > 0) long = Math.min(long, longKm)
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

/**
 * Recommencer le plan aujourd'hui : la semaine 1 est cette semaine, au niveau du moment (moyenne des semaines courues
 * parmi les 4 dernières, plus longue sortie des 30 derniers jours) s'il est au-dessus de celui du profil : recommencer
 * ne fait jamais descendre de niveau (ni passer en course-marche). L'historique ne bouge pas.
 */
export function restartPlan(p: MarathonProfile, done: DoneRun[], today: Day): MarathonProfile {
  const monday = weekStart(today)
  const recent = done.filter((r) => r.day >= addDays(monday, -28) && r.day < monday)
  const weeks = new Set(recent.map((r) => weekStart(r.day))).size
  const month = done.filter((r) => r.day >= addDays(today, -30) && r.day <= today)
  const weeklyKm = Math.max(p.level.weeklyKm, weeks > 0 ? Math.round(recent.reduce((s, r) => s + r.km, 0) / weeks) : 0)
  const longestKm = Math.max(p.level.longestKm, month.length > 0 ? round05(Math.max(...month.map((r) => r.km))) : 0)
  return { ...p, startedOn: today, level: { ...p.level, weeklyKm, longestKm } }
}

/** Ce qui est prévu un jour donné. */
export function plannedOn(plan: Plan, day: Day): { runs: PlannedRun[]; strength: PlannedStrength[] } {
  const w = plan.weeks.find((x) => day >= x.start && day <= addDays(x.start, 6))
  return { runs: w?.runs.filter((r) => r.day === day) ?? [], strength: w?.strength.filter((s) => s.day === day) ?? [] }
}

/**
 * Le guide d'une sortie qui n'est pas au plan (ajoutée à la main) : les mêmes séances et les mêmes allures que le plan,
 * au cran de la semaine du jour : plus on avance (base, développement, spécifique), plus le fractionné et le seuil sont
 * exigeants, et la sortie longue finit à allure course en phase spécifique. Sans plan marathon : la base, sans allures chiffrées.
 */
export function guideRun(kind: RunKind, km: number, plan: Plan | null, raceKind: RaceKind, day: Day): PlannedRun {
  const w = plan?.weeks.find((x) => day >= x.start && day <= addDays(x.start, 6)) ?? (plan ? plan.weeks[clamp(plan.current, 0, plan.weeks.length - 1)] : null)
  const phase: Phase = w?.phase ?? 'base'
  const deload = w?.deload ?? false
  const walkRun = plan?.walkRun ?? false
  const longPace = plan?.paces.secPerKm.long?.[1] ?? DEFAULT_LONG_PACE[walkRun ? 'walkRun' : (plan?.level ?? 'regular')]
  const i = w?.index ?? 0
  const shape: WeekShape = {
    index: i,
    ...(plan && w
      ? progress(
          plan.weeks.map((x) => x.phase),
          i,
        )
      : { t: 0, pt: 0 }),
    test: false,
    start: w?.start ?? day,
    phase,
    deload,
    sick: false,
    frozen: false,
    raceWeek: false,
    firstTaper: false,
    km: w?.km || Math.max(km / 0.15, 20),
    longKm: w?.longKm || km,
  }
  const done = (d: Omit<Draft, 'day' | 'km'> & { km?: number }, longMp = 0): PlannedRun => {
    const run: Draft = { day, km: d.km ?? km, kind: d.kind, detail: d.detail, pace: d.pace, segments: d.segments }
    return { ...run, fastKm: round05(hardKm(run, longMp)) }
  }
  switch (kind) {
    case 'easy':
    case 'walkRun':
      return walkRun || kind === 'walkRun'
        ? done({ kind, detail: 'En aisance, en alternant course et marche', pace: 'easy', segments: walkRunSegments(km, phase, longPace) })
        : done({ kind, detail: 'En aisance : tu peux parler en phrases', pace: 'easy', segments: [] })
    case 'recovery':
      return done({ kind, detail: 'Très facile, pour récupérer', pace: 'recovery', segments: [] })
    case 'long': {
      // Même règle que le plan : de l'allure course sur la fin seulement en phase spécifique, sinon une sortie longue facile et régulière.
      const mp = walkRun || deload || phase !== 'specific' ? 0 : clamp(round05(km * (0.15 + 0.2 * shape.pt)), 3, 12)
      const detail = walkRun
        ? 'Sortie longue en course-marche'
        : mp > 0
          ? `Sortie longue dont ${mp.toLocaleString('fr-FR')} km à allure course sur la fin`
          : 'Sortie longue, régulière et facile'
      return done({ kind, detail, pace: 'long', segments: walkRun ? walkRunSegments(km, phase, longPace) : [] }, mp)
    }
    case 'threshold':
    case 'intervals':
    case 'hills':
    case 'fartlek':
    case 'racePace':
    case 'test':
      return done(
        qualityRun(kind, shape, raceKind, plan?.paces.secPerKm.intervals?.[0] ?? Math.round(longPace * 0.78), km > 0 && kind !== 'test' ? km : undefined),
        0,
      )
    case 'cross':
      return done({ kind, detail: 'Vélo ou marche, sans impact, 45 min faciles', pace: null, segments: [], km: 0 })
    case 'race':
      return done({ kind, detail: 'Le jour J', pace: 'marathon', segments: [] })
  }
}

/**
 * Les blocs d'une sortie pour le minuteur : ceux du plan (fractionné, seuil, course-marche) ; pour une sortie longue ou
 * à allure course, découpés en kilomètres puis convertis en temps avec les allures du plan (facile, puis allure course).
 */
export function runSegments(run: PlannedRun, plan: Plan | null): Segment[] {
  if (run.segments.length > 0) return run.segments
  if (!plan || run.km <= 0) return []
  const longPace = plan.paces.secPerKm.long?.[1] ?? DEFAULT_LONG_PACE[plan.walkRun ? 'walkRun' : plan.level]
  const easyPace = plan.paces.secPerKm.easy?.[1] ?? longPace
  const mpPace = plan.paces.secPerKm.marathon?.[1] ?? Math.round(longPace * 0.88)
  if (run.kind === 'long') {
    const mp = Math.min(run.fastKm, run.km)
    return mp > 0
      ? [
          { label: 'Facile', sec: Math.round((run.km - mp) * longPace), pace: 'long' },
          { label: 'Allure course', sec: Math.round(mp * mpPace), pace: 'marathon' },
        ]
      : [{ label: 'Régulier et facile', sec: Math.round(run.km * longPace), pace: 'long' }]
  }
  if (run.kind === 'racePace' && run.km > 3)
    return [
      { label: 'Échauffement facile', sec: Math.round(1.5 * easyPace), pace: 'easy' },
      { label: 'Allure course', sec: Math.round((run.km - 3) * mpPace), pace: 'marathon' },
      { label: 'Retour au calme', sec: Math.round(1.5 * easyPace), pace: 'easy' },
    ]
  return []
}
