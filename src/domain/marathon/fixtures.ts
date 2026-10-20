/** Profils types du générateur (tests et aperçu). */
import { DEFAULT_THRESHOLDS, type MarathonProfile } from './profile'

export const TODAY = '2026-10-19'

export const profile = (over: Omit<Partial<MarathonProfile>, 'level'> & { level?: Partial<MarathonProfile['level']> } = {}): MarathonProfile => {
  const { level, ...rest } = over
  return {
    race: { name: 'Marathon de Paris', day: '2027-04-11', kind: 'marathon', goalSec: null },
    walkRun: false,
    body: { heightCm: 180, birthYear: 1995, sex: 'm' },
    level: { weeklyKm: 35, longestKm: 16, years: 4, chrono: { distance: '10k', sec: 48 * 60, day: '2026-09-20' }, ...level },
    constraints: { days: [1, 3, 5, 6], longRunDay: 6, gym: true },
    health: { pains: '', hrMax: null, hrRest: null },
    thresholds: DEFAULT_THRESHOLDS,
    startedOn: TODAY,
    sickWeeks: [],
    ...rest,
  }
}
