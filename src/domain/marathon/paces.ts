/**
 * Allures (lot 3) : formule de Riegel depuis un chrono récent, avec une marge prudente (Riegel est optimiste
 * pour un premier marathon). Sans chrono : allures au ressenti, et zones cardiaques si on les connaît.
 */
import { addDays, daysBetween } from '../date'
import { CHRONO_KM, RACE_KM, type Chrono, type ChronoDistance, type MarathonProfile } from './profile'

/** Exposant de Riegel et marge prudente appliquée aux temps prédits. */
export const RIEGEL_EXPONENT = 1.06
export const PRUDENT_MARGIN = 1.05
/** Marge des allures de travail (seuil, fractionné) : plus exigeante que celle de la course. */
export const TRAIN_MARGIN = 1.03

/** Temps prédit sur `toKm` à partir d'un temps `sec` sur `fromKm`. */
export const riegel = (sec: number, fromKm: number, toKm: number) => sec * (toKm / fromKm) ** RIEGEL_EXPONENT

export type PaceKind = 'easy' | 'long' | 'recovery' | 'marathon' | 'threshold' | 'intervals'

export interface Paces {
  source: 'chrono' | 'feel'
  /** Temps visé sur la course (avec la marge), null sans chrono. */
  predictedSec: number | null
  /** Allures en secondes par km : [plus rapide, plus lente]. Absentes sans chrono. */
  secPerKm: Partial<Record<PaceKind, [number, number]>>
  /** Repère au ressenti, toujours présent. */
  feel: Record<PaceKind, string>
  /** Zones cardiaques (bpm), si la FC max est connue. */
  hr: Partial<Record<PaceKind, [number, number]>>
  notes: string[]
}

const FEEL: Record<PaceKind, string> = {
  easy: 'facile : tu peux parler en phrases (effort 3-4 sur 10)',
  long: 'facile et régulière, un peu plus lente que le footing',
  recovery: 'très facile, presque en marchant (effort 2 sur 10)',
  marathon: 'soutenue mais tenable longtemps (effort 5-6 sur 10)',
  threshold: 'confortablement difficile : quelques mots seulement (effort 7 sur 10)',
  intervals: 'dur mais régulier sur chaque répétition (effort 8 sur 10)',
}

/** Zones en % de la réserve cardiaque (Karvonen) ou de la FC max. */
const HR_ZONES: Record<PaceKind, [number, number]> = {
  recovery: [0.55, 0.65],
  easy: [0.65, 0.75],
  long: [0.65, 0.75],
  marathon: [0.75, 0.82],
  threshold: [0.85, 0.9],
  intervals: [0.9, 0.95],
}

/** « 5:42 » pour 342 s/km. */
export const formatPace = (secPerKm: number) => `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, '0')}`

/** « 3 h 52 », « 52 min 10 s ». */
export function formatDuration(sec: number): string {
  const s = Math.round(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min ${String(s % 60).padStart(2, '0')} s`
}

/** Allure typique des sorties récentes : la médiane des 6 dernières semaines (3 sorties d'au moins 3 km), en s/km. */
export function typicalPace(runs: { day: string; km: number; sec?: number }[], today: string): number | null {
  const from = addDays(today, -42)
  const paces = runs
    .filter((r) => r.day >= from && r.day <= today && r.km >= 3 && r.sec !== undefined && r.sec > 0)
    .map((r) => r.sec! / r.km)
    .sort((a, b) => a - b)
  if (paces.length < 3) return null
  const mid = Math.floor(paces.length / 2)
  return paces.length % 2 ? paces[mid] : (paces[mid - 1] + paces[mid]) / 2
}

/** Part du programme parcourue : 0 au départ, 1 au pic (trois semaines avant la course). */
const programmeProgress = (p: MarathonProfile, today: string) => {
  const peak = addDays(p.race.day, -21)
  return Math.min(1, Math.max(0, daysBetween(p.startedOn, today) / Math.max(1, daysBetween(p.startedOn, peak))))
}

/** Au plus de combien le programme resserre les allures par rapport à celles du départ (7 %). */
export const MAX_TIGHTENING = 0.07
/** Les allures de travail (seuil, fractionné) démarrent un cran plus prudentes que le reste (8 %), puis rejoignent les autres au pic du programme. */
const QUALITY_EASE_IN = 0.08

export function paces(p: MarathonProfile, today: string, typical: number | null = null): Paces {
  const raceKm = RACE_KM[p.race.kind]
  const notes: string[] = []
  const hr: Paces['hr'] = {}
  const age = p.body.birthYear ? Number(today.slice(0, 4)) - p.body.birthYear : null
  const hrMax = p.health.hrMax ?? null
  if (hrMax) {
    const rest = p.health.hrRest
    for (const [k, [lo, hi]] of Object.entries(HR_ZONES) as [PaceKind, [number, number]][])
      hr[k] = rest ? [Math.round(rest + lo * (hrMax - rest)), Math.round(rest + hi * (hrMax - rest))] : [Math.round(lo * hrMax), Math.round(hi * hrMax)]
  } else if (age !== null) {
    notes.push(`Sans FC max connue, compte environ ${Math.round(208 - 0.7 * age)} bpm (estimation selon l'âge, à vérifier).`)
  }

  const c = p.level.chrono
  if (!c) return { source: 'feel', predictedSec: null, secPerKm: {}, feel: FEEL, hr, notes: ['Pas de chrono récent : allures au ressenti.', ...notes] }

  const fromKm = CHRONO_KM[c.distance]
  const at = (km: number) => (riegel(c.sec, fromKm, km) * PRUDENT_MARGIN) / km
  // Les allures de travail (seuil, fractionné) visent ta forme du jour, avec une marge réduite : la prudence pleine reste pour la course.
  const train = (km: number) => (riegel(c.sec, fromKm, km) * TRAIN_MARGIN) / km
  let race = at(raceKm)
  const predictedSec = race * raceKm
  // Objectif plus lent que le chrono : on s'entraîne à l'objectif (prudence). Plus rapide : on garde le chrono.
  if (p.race.goalSec) {
    const goal = p.race.goalSec / raceKm
    if (goal > race) race = goal
    else
      notes.push(
        `Ton objectif (${formatDuration(p.race.goalSec)}) est plus rapide que ce que ton chrono permet aujourd'hui (${formatDuration(predictedSec)}) : les allures suivent ton chrono.`,
      )
  }
  // L'allure marathon sert de référence même pour un semi (footing et sortie longue).
  const marathon = p.race.kind === 'marathon' ? race : at(RACE_KM.marathon)
  const r = (x: number) => Math.round(x)
  // Calage sur tes sorties : si tu cours plus lentement que ton chrono ne le laisse prévoir, toutes les zones partent d'un cran plus lent
  // (la sortie typique se place en haut de la zone « facile »), puis se resserrent ensemble, de 7 % au plus, jusqu'au pic du programme.
  // Une seule échelle pour toutes les zones : rien ne se déséquilibre.
  let scale = 1
  let easeIn = 0
  if (typical !== null) {
    const start = Math.min(1.25, Math.max(1, typical / 1.2 / marathon))
    const end = Math.max(1, start * (1 - MAX_TIGHTENING))
    const t = programmeProgress(p, today)
    scale = start - (start - end) * t
    easeIn = start > 1 ? QUALITY_EASE_IN * (1 - t) : 0
    if (start > 1)
      notes.push(
        `Allures calées sur tes sorties récentes (autour de ${formatPace(typical)} /km), puis resserrées de ${Math.round(MAX_TIGHTENING * 100)} % au plus jusqu'à la phase spécifique.`,
      )
  }
  const z = (x: number, quality = false) => r(x * scale * (quality ? 1 + easeIn : 1))
  return {
    source: 'chrono',
    predictedSec,
    secPerKm: {
      marathon: [z(race), z(race)],
      easy: [z(marathon * 1.12), z(marathon * 1.22)],
      long: [z(marathon * 1.15), z(marathon * 1.25)],
      recovery: [z(marathon * 1.28), z(marathon * 1.38)],
      threshold: [z(train(15), true), z(train(15) * 1.02, true)],
      intervals: [z(train(5), true), z(train(5) * 1.02, true)],
    },
    feel: FEEL,
    hr,
    notes,
  }
}

/** La distance de chrono reconnue pour une sortie (±3 %), sinon null. */
export function chronoDistanceOf(km: number): ChronoDistance | null {
  return (Object.entries(CHRONO_KM) as [ChronoDistance, number][]).find(([, d]) => Math.abs(km - d) <= d * 0.03)?.[0] ?? null
}

/**
 * Une sortie bat-elle le chrono de référence ? On compare leurs équivalents marathon (Riegel) : un 10 km rapide
 * peut remplacer un semi plus ancien. Retourne le nouveau chrono, ou null.
 */
export function betterChrono(current: Chrono | null, run: { km: number; sec: number; day: string }): Chrono | null {
  const distance = chronoDistanceOf(run.km)
  if (!distance || run.sec <= 0) return null
  const sec = Math.round(run.sec * (CHRONO_KM[distance] / run.km))
  const candidate: Chrono = { distance, sec, day: run.day }
  if (!current) return candidate
  const eq = (c: Chrono) => riegel(c.sec, CHRONO_KM[c.distance], RACE_KM.marathon)
  return eq(candidate) < eq(current) ? candidate : null
}
