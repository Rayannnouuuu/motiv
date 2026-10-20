import { formatPace, type PaceKind, type Paces } from '../../domain/marathon/paces'
import { RUN_LABELS, type PlannedRun } from '../../domain/marathon/plan'
import type { RaceKind } from '../../domain/marathon/profile'

const nf = (n: number) => n.toLocaleString('fr-FR')
export const km = (n: number) => `${nf(Math.round(n * 10) / 10)} km`

/** « 5:42–6:10 /km », ou le repère au ressenti (et la zone cardiaque si connue). */
export function paceText(p: Paces, kind: PaceKind | 'walk' | null): string {
  if (kind === null) return ''
  if (kind === 'walk') return 'marche active'
  const hr = p.hr[kind] ? ` · ${p.hr[kind]![0]}-${p.hr[kind]![1]} bpm` : ''
  const s = p.secPerKm[kind]
  if (!s) return `${p.feel[kind]}${hr}`
  return `${s[0] === s[1] ? formatPace(s[0]) : `${formatPace(s[0])}–${formatPace(s[1])}`} /km${hr}`
}

/** Nom d'une sortie : « Allure course » devient « Allure marathon » ou « Allure semi ». */
export const runLabel = (r: Pick<PlannedRun, 'kind'>, race: RaceKind) =>
  r.kind === 'racePace' ? (race === 'marathon' ? 'Allure marathon' : 'Allure semi') : RUN_LABELS[r.kind]

/** « mar. 20 oct. » */
export const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
