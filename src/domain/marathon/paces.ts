/**
 * Allures (lot 3) : formule de Riegel depuis un chrono récent, avec une marge prudente (Riegel est optimiste
 * pour un premier marathon). Sans chrono : allures au ressenti, et zones cardiaques si on les connaît.
 */
import { CHRONO_KM, RACE_KM, type Chrono, type ChronoDistance, type MarathonProfile } from './profile'

/** Exposant de Riegel et marge prudente appliquée aux temps prédits. */
export const RIEGEL_EXPONENT = 1.06
export const PRUDENT_MARGIN = 1.05

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

export function paces(p: MarathonProfile, today: string): Paces {
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
  return {
    source: 'chrono',
    predictedSec,
    secPerKm: {
      marathon: [r(race), r(race)],
      easy: [r(marathon * 1.15), r(marathon * 1.25)],
      long: [r(marathon * 1.18), r(marathon * 1.28)],
      recovery: [r(marathon * 1.3), r(marathon * 1.4)],
      threshold: [r(at(15)), r(at(15) * 1.02)],
      intervals: [r(at(5)), r(at(5) * 1.02)],
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
