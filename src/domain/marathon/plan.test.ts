import { describe, expect, test } from 'vitest'
import { addDays, daysBetween } from '../date'
import { feasibility } from './feasibility'
import { profile, TODAY } from './fixtures'
import { betterChrono, paces, PRUDENT_MARGIN } from './paces'
import { generatePlan, HARD_KINDS, restartPlan, RULES, type DoneRun, type Plan } from './plan'
import type { MarathonProfile } from './profile'

/** Les règles du cahier des charges, vérifiées semaine par semaine. */
function checkRules(plan: Plan, p: MarathonProfile) {
  const { weeks } = plan
  const n = weeks.length
  const growth = plan.cautious ? RULES.growthCautious : RULES.growth
  const longPace = plan.paces.secPerKm.long?.[1]
  const build = weeks.filter((w) => w.phase !== 'taper' && !w.deload && !w.sick)
  const peak = Math.max(...build.map((w) => w.km))

  let lastBuild: (typeof weeks)[number] | null = null
  let sinceDeload = 0
  for (const w of weeks) {
    const raceWeek = w.index === n - 1
    // Jours : seulement ceux disponibles (la course exceptée), 3 à 5 sorties.
    for (const r of w.runs) if (r.kind !== 'race') expect(p.constraints.days).toContain((daysBetween(w.start, r.day) + 7) % 7)
    if (!raceWeek) {
      expect(w.runs.length).toBeGreaterThanOrEqual(Math.min(3, p.constraints.days.length))
      expect(w.runs.length).toBeLessThanOrEqual(5)
    }
    // Environ 80 % en endurance facile (le test 5 km, seul dans sa semaine toutes les 6 semaines, est à part).
    const fast = w.runs.filter((r) => r.kind !== 'test').reduce((s, r) => s + r.fastKm, 0)
    if (!raceWeek) expect(fast).toBeLessThanOrEqual(w.km * RULES.hardShare + 0.5)
    // Sortie longue : plafonnée à 32 km et 3 h.
    expect(w.longKm).toBeLessThanOrEqual(RULES.longCapKm)
    if (longPace) expect(w.longKm * longPace).toBeLessThanOrEqual(RULES.longCapSec + 300)
    if (w.phase !== 'taper' && !w.sick) {
      if (w.deload && lastBuild) {
        // Semaine allégée : environ 25 % de moins.
        expect(w.km / lastBuild.km).toBeGreaterThan(0.6)
        expect(w.km / lastBuild.km).toBeLessThan(0.85)
        sinceDeload = 0
      } else if (!w.deload) {
        if (lastBuild) {
          // +10 % au plus d'une semaine de charge à l'autre (arrondi au demi-km), sortie longue +3 km au plus.
          expect(w.km).toBeLessThanOrEqual(lastBuild.km * growth + 0.5)
          expect(w.longKm - lastBuild.longKm).toBeLessThanOrEqual(3)
        }
        lastBuild = w
        if (w.index < n - 5) expect(++sinceDeload).toBeLessThanOrEqual(plan.cautious ? 3 : 4)
      }
    }
    // Renfo : 2 en base et développement, 1 en spécifique, 1 légère au début de l'affûtage, rien les 10 derniers jours.
    const max = { base: 2, development: 2, specific: 1, taper: 1 }[w.phase]
    expect(w.strength.length).toBeLessThanOrEqual(max)
    for (const s of w.strength) {
      expect(daysBetween(s.day, p.race.day)).toBeGreaterThan(RULES.noStrengthDays)
      if (w.phase === 'taper') expect(s.light).toBe(true)
      const next = w.runs.find((r) => r.day === addDays(s.day, 1)) ?? weeks[w.index + 1]?.runs.find((r) => r.day === addDays(s.day, 1))
      // Jamais la veille d'une sortie longue ou d'une séance de qualité, jamais le jour de la sortie longue.
      expect(next && (next.kind === 'long' || next.kind === 'race' || HARD_KINDS.has(next.kind))).toBeFalsy()
      expect(w.runs.find((r) => r.day === s.day)?.kind).not.toBe('long')
      // Le même jour qu'une séance dure quand il y en a une de libre.
      const hard = w.runs.filter((r) => HARD_KINDS.has(r.kind))
      const eligible = hard.filter((r) => daysBetween(r.day, p.race.day) > RULES.noStrengthDays)
      if (eligible.length >= w.strength.length) expect(eligible.map((r) => r.day)).toContain(s.day)
    }
  }
  // La plus longue sortie a lieu 3 semaines avant la course.
  const longest = Math.max(...weeks.map((w) => w.longKm))
  expect(weeks[n - 4].longKm).toBe(longest)
  expect(weeks.slice(n - 3).every((w) => w.longKm < longest)).toBe(true)
  // Affûtage : volume réduit de 40 à 60 % (hors semaine de la course).
  for (const w of weeks.filter((x) => x.phase === 'taper' && x.index < n - 1)) {
    expect(w.km / peak).toBeGreaterThanOrEqual(0.4)
    expect(w.km / peak).toBeLessThanOrEqual(0.6 + 0.02)
  }
  // La course, le bon jour.
  expect(weeks[n - 1].runs.at(-1)).toMatchObject({ kind: 'race', day: p.race.day })
}

const PROFILES: [string, MarathonProfile, number | null][] = [
  ['confirmé, 25 semaines', profile(), 75],
  [
    'régulier, petit volume, 22 semaines',
    profile({
      race: { name: 'Marathon', day: '2027-03-21', kind: 'marathon', goalSec: null },
      level: { weeklyKm: 15, longestKm: 8, years: 2, chrono: { distance: '10k', sec: 58 * 60, day: TODAY } },
    }),
    72,
  ],
  [
    'débutant complet, 30 semaines, à la maison',
    profile({
      race: { name: 'Marathon', day: '2027-05-16', kind: 'marathon', goalSec: null },
      level: { weeklyKm: 0, longestKm: 0, years: 0, chrono: null },
      constraints: { days: [0, 2, 5], longRunDay: 5, gym: false },
    }),
    70,
  ],
  [
    'IMC 31, 30 semaines : prudent',
    profile({ race: { name: 'Marathon', day: '2027-05-16', kind: 'marathon', goalSec: null }, level: { weeklyKm: 20, longestKm: 10, years: 1, chrono: null } }),
    100,
  ],
  [
    'confirmé avec une douleur signalée, 5 jours, 25 semaines',
    profile({ health: { pains: 'Genou droit après 15 km', hrMax: 190, hrRest: 50 }, constraints: { days: [0, 1, 3, 4, 6], longRunDay: 6, gym: true } }),
    75,
  ],
  [
    'semi, régulier, 12 semaines',
    profile({ race: { name: 'Semi de Paris', day: '2027-01-10', kind: 'half', goalSec: null }, level: { weeklyKm: 18, longestKm: 10, years: 2 } }),
    72,
  ],
  [
    'confirmé, 5 jours, 18 semaines, objectif 3 h 30',
    profile({
      race: { name: 'Marathon', day: '2027-02-21', kind: 'marathon', goalSec: 3.5 * 3600 },
      level: { weeklyKm: 45, longestKm: 22, years: 6, chrono: { distance: 'half', sec: 95 * 60, day: TODAY } },
      constraints: { days: [0, 1, 3, 4, 6], longRunDay: 6, gym: true },
    }),
    70,
  ],
  [
    'régulier, 20 km par semaine, marathon en septembre (50 semaines)',
    profile({
      race: { name: 'Marathon', day: '2027-09-26', kind: 'marathon', goalSec: null },
      level: { weeklyKm: 20, longestKm: 10, years: 1, chrono: null },
      constraints: { days: [1, 3, 5, 6], longRunDay: 6, gym: true },
    }),
    75,
  ],
  [
    'course-marche choisie, régulier, 20 semaines',
    profile({ walkRun: true, race: { name: 'Marathon', day: '2027-03-07', kind: 'marathon', goalSec: null }, level: { weeklyKm: 25, longestKm: 12 } }),
    75,
  ],
]

describe('générateur de plan : profils types', () => {
  test.each(PROFILES)('%s : faisable, et toutes les règles tenues', (_, p, weight) => {
    const f = feasibility(p, weight, TODAY)
    expect(f.ok).toBe(true)
    const plan = generatePlan(p, weight, [], TODAY)
    expect(plan.weeks).toHaveLength(f.weeks)
    checkRules(plan, p)
  })

  test('4 phases dans l’ordre, affûtage de 3 semaines sur un plan long', () => {
    const plan = generatePlan(profile(), 75, [], TODAY)
    const phases = plan.weeks.map((w) => w.phase)
    expect([...new Set(phases)]).toEqual(['base', 'development', 'specific', 'taper'])
    expect(phases.filter((x) => x === 'taper')).toHaveLength(3)
    // Musculation orientée course, affichée clairement.
    expect(plan.weeks[0].strength).toHaveLength(2)
  })

  test('débutant : course-marche partout, sans séance dure', () => {
    const plan = generatePlan(PROFILES[2][1], 70, [], TODAY)
    expect(plan.walkRun).toBe(true)
    const kinds = new Set(plan.weeks.flatMap((w) => w.runs.map((r) => r.kind)))
    expect([...kinds].sort()).toEqual(['long', 'race', 'walkRun'])
    expect(plan.weeks[0].runs[0].segments.some((s) => s.label === 'Marche')).toBe(true)
  })

  test('prudent (IMC 31) : progression à 5 %, allègement toutes les 3 semaines, une séance dure au plus', () => {
    const plan = generatePlan(PROFILES[3][1], 100, [], TODAY)
    expect(plan.cautious).toBe(true)
    expect(plan.weeks[2].deload).toBe(true)
    expect(Math.max(...plan.weeks.map((w) => w.runs.filter((r) => ['threshold', 'intervals', 'racePace'].includes(r.kind)).length))).toBeLessThanOrEqual(1)
  })
})

describe('faisabilité', () => {
  test('délai trop court (régulier, 10 semaines) : refus argumenté et 3 options', () => {
    const p = profile({ race: { name: 'Marathon', day: '2026-12-27', kind: 'marathon', goalSec: null }, level: { weeklyKm: 15, longestKm: 8 } })
    const f = feasibility(p, 72, TODAY)
    expect(f).toMatchObject({ ok: false, weeks: 10, minWeeks: 20, level: 'regular' })
    expect(f.reasons.at(-1)).toBe('Il manque 10 semaines : je ne génère pas de plan risqué pour tenir cette date.')
    expect(f.options).toEqual([
      { kind: 'walkRun', available: false, minWeeks: 16, why: 'Course-marche : 16 semaines au minimum, il en manque 6.' },
      { kind: 'half', available: true, minWeeks: 10, why: 'Viser un semi-marathon à cette date.' },
      { kind: 'later', day: '2027-03-07', why: 'Choisir une course à partir du 07/03/2027.' },
    ])
    expect(f.medical).toMatch(/avis médical/)
  })

  test('débutant complet : 26 semaines minimum, en course-marche', () => {
    const p = profile({ level: { weeklyKm: 0, longestKm: 0, years: 0, chrono: null } })
    expect(feasibility(p, 70, TODAY)).toMatchObject({ ok: false, weeks: 25, minWeeks: 26, walkRun: true })
  })

  test('IMC à partir de 30 ou douleur : mode prudent, 4 semaines de plus', () => {
    const heavy = feasibility(profile(), 100, TODAY)
    expect(heavy).toMatchObject({ cautious: true, bmi: 30.9, minWeeks: 16 })
    expect(feasibility(profile({ health: { pains: 'tendinite', hrMax: null, hrRest: null } }), 75, TODAY).cautious).toBe(true)
    expect(feasibility(profile(), 75, TODAY).cautious).toBe(false)
  })

  test('confirmé à 13 semaines : faisable mais serré', () => {
    const f = feasibility(profile({ race: { name: 'M', day: '2027-01-17', kind: 'marathon', goalSec: null } }), 75, TODAY)
    expect(f).toMatchObject({ ok: true, weeks: 13 })
    expect(f.reasons.at(-1)).toBe("C'est faisable, mais serré : 16 semaines seraient plus confortables.")
  })
})

describe('allures', () => {
  test('Riegel avec la marge prudente, depuis un 10 km en 48 min', () => {
    const pc = paces(profile(), TODAY)
    const predicted = 48 * 60 * (42.195 / 10) ** 1.06 * PRUDENT_MARGIN
    expect(pc.predictedSec).toBeCloseTo(predicted, 0)
    expect(pc.secPerKm.marathon![0]).toBe(Math.round(predicted / 42.195))
    expect(pc.secPerKm.easy![0]).toBeGreaterThan(pc.secPerKm.marathon![0])
    expect(pc.secPerKm.intervals![0]).toBeLessThan(pc.secPerKm.threshold![0])
  })

  test('objectif plus rapide que le chrono : on garde le chrono, et on le dit', () => {
    const pc = paces(profile({ race: { name: 'M', day: '2027-04-11', kind: 'marathon', goalSec: 3 * 3600 } }), TODAY)
    expect(pc.notes.some((x) => x.startsWith('Ton objectif (3 h 00) est plus rapide'))).toBe(true)
  })

  test('sans chrono : au ressenti, zones cardiaques (Karvonen) si connues', () => {
    const pc = paces(profile({ level: { chrono: null }, health: { pains: '', hrMax: 190, hrRest: 50 } }), TODAY)
    expect(pc).toMatchObject({ source: 'feel', predictedSec: null, secPerKm: {} })
    expect(pc.hr.easy).toEqual([141, 155])
    expect(pc.feel.threshold).toMatch(/confortablement difficile/)
  })

  test('un chrono battu en sortie devient la référence', () => {
    const current = { distance: '10k' as const, sec: 48 * 60, day: '2026-09-20' }
    expect(betterChrono(current, { km: 10.05, sec: 47 * 60, day: TODAY })).toEqual({ distance: '10k', sec: Math.round(47 * 60 * (10 / 10.05)), day: TODAY })
    expect(betterChrono(current, { km: 10, sec: 49 * 60, day: TODAY })).toBeNull()
    expect(betterChrono(current, { km: 12, sec: 50 * 60, day: TODAY })).toBeNull()
  })
})

describe('plan exigeant (lot 28) : marathon en septembre, 20 km par semaine au départ', () => {
  const p = profile({
    race: { name: 'Marathon', day: '2027-09-26', kind: 'marathon', goalSec: null },
    level: { weeklyKm: 20, longestKm: 10, years: 1, chrono: null },
    constraints: { days: [1, 3, 5, 6], longRunDay: 6, gym: true },
  })
  const plan = generatePlan(p, 75, [], TODAY)
  const { weeks } = plan
  const hard = (w: Plan['weeks'][number]) => w.runs.filter((r) => HARD_KINDS.has(r.kind) && r.kind !== 'test')
  const build = weeks.filter((w) => w.phase !== 'taper' && !w.deload)

  test('un bloc vitesse, puis 7 semaines de développement et 8 de spécifique avant l’affûtage', () => {
    const count = (ph: string) => weeks.filter((w) => w.phase === ph).length
    expect(count('development')).toBe(7)
    expect(count('specific')).toBe(8)
    expect(count('taper')).toBe(3)
    expect(count('base')).toBe(weeks.length - 18)
  })

  test('des séances rapides dès la première semaine, deux par semaine dès 30 km', () => {
    expect(hard(weeks[0]).map((r) => r.kind)).toEqual(['hills'])
    const speed = new Set(weeks.filter((w) => w.phase === 'base').flatMap((w) => hard(w).map((r) => r.kind)))
    expect([...speed].sort()).toEqual(['fartlek', 'hills', 'intervals', 'threshold'])
    for (const w of build.filter((x) => x.km >= 30 && x.index >= 2 && !x.runs.some((r) => r.kind === 'test') && x.phase !== 'specific'))
      expect(hard(w)).toHaveLength(2)
  })

  test('un test sur 5 km toutes les 6 semaines en base et en développement', () => {
    const tests = weeks.filter((w) => w.runs.some((r) => r.kind === 'test')).map((w) => w.index)
    expect(tests.length).toBeGreaterThanOrEqual(5)
    expect(tests.every((i) => i % 6 === 5 && ['base', 'development'].includes(weeks[i].phase))).toBe(true)
    // Seul dans sa semaine : jambes fraîches.
    for (const i of tests) expect(hard(weeks[i])).toEqual([])
  })

  test('les séances progressent : de 3 × 8 min de seuil à 25 min d’affilée, de 8 × 400 m à 6 × 1000 m', () => {
    const details = (kind: string) => weeks.flatMap((w) => w.runs.filter((r) => r.kind === kind).map((r) => r.detail))
    expect(details('threshold')[0]).toMatch(/^15 min facile, [34] × 8 min au seuil/)
    expect(details('threshold').some((d) => d.includes('25 min au seuil'))).toBe(true)
    expect(details('intervals')[0]).toContain('8 × 400 m')
    expect(details('intervals').some((d) => d.includes('× 1000 m'))).toBe(true)
    const mp = weeks.flatMap((w) => w.runs.filter((r) => r.kind === 'racePace').map((r) => r.fastKm))
    expect(Math.max(...mp)).toBeGreaterThanOrEqual(12)
  })

  test('pas de plateau de plusieurs mois : le pic de volume arrive en spécifique', () => {
    const peak = Math.max(...build.map((w) => w.km))
    expect(build.find((w) => w.km === peak)!.phase).toBe('specific')
    expect(Math.max(...build.filter((w) => w.phase === 'base').map((w) => w.km))).toBeLessThan(peak)
  })

  test('des footings qui comptent (6 km dès 30 km par semaine), avec des accélérations une fois par semaine', () => {
    for (const w of weeks.slice(0, -1)) {
      if (w.km >= 30) for (const r of w.runs.filter((x) => x.kind === 'easy')) expect(r.km).toBeGreaterThanOrEqual(6)
      expect(w.runs.filter((r) => r.segments.some((s) => s.label === 'Accélération'))).toHaveLength(1)
    }
  })
})

describe('adaptation semaine après semaine', () => {
  const p = profile()
  const run = (day: string, km: number, pain: number | null = 0): DoneRun => ({ day, km, pain })
  const week0 = generatePlan(p, 75, [], TODAY).weeks[0]
  const all = (km: number) => week0.runs.map((r) => run(r.day, (r.km * km) / week0.km))

  test('semaine faite : la suivante monte de 10 % au plus', () => {
    const plan = generatePlan(p, 75, all(week0.km), '2026-10-26')
    expect(plan.weeks[0].doneKm).toBeCloseTo(week0.km, 0)
    expect(plan.weeks[1].km).toBeGreaterThan(week0.km)
    expect(plan.alerts).toEqual([])
  })

  test('faite à 65 % : on repart de ce qui a été fait', () => {
    const did = week0.km * 0.65
    const plan = generatePlan(p, 75, all(did), '2026-10-26')
    // Le plan repart de ce qui a été fait, sans descendre sous 70 % du volume de départ.
    expect(plan.weeks[1].km).toBeLessThanOrEqual(Math.max(did, week0.km * 0.7) * 1.1 + 0.5)
    expect(plan.weeks[1].km).toBeLessThan(week0.km * 1.1)
  })

  test('faite à 75 % : presque tenue, on garde le même volume avant de monter', () => {
    const plan = generatePlan(p, 75, all(week0.km * 0.75), '2026-10-26')
    expect(plan.weeks[1].km).toBeLessThanOrEqual(week0.km + 0.5)
    expect(plan.weeks[1].km).toBeGreaterThanOrEqual(week0.km - 0.5)
    // La sortie longue faite à 75 % plafonne aussi celle de la semaine (+10 % au plus).
    expect(plan.alerts).toEqual([
      'Semaine presque tenue : on garde le même volume avant de monter.',
      expect.stringMatching(/^Ta plus longue sortie du dernier mois/),
    ])
  })

  test('faite à 90 % : tenue, la progression continue (elle ne repart pas de ce qui a été couru)', () => {
    const plan = generatePlan(p, 75, all(week0.km * 0.9), '2026-10-26')
    expect(plan.weeks[1].km).toBeGreaterThan(week0.km)
    expect(plan.alerts.filter((a) => !a.startsWith('Ta plus longue sortie'))).toEqual([])
  })

  test('une sortie ne dépasse jamais de plus de 10 % la plus longue du dernier mois', () => {
    const plan = generatePlan(p, 75, all(week0.km * 0.6), '2026-10-26')
    const longest = week0.longKm * 0.6
    for (const r of plan.weeks[1].runs) expect(r.km).toBeLessThanOrEqual(Math.round(longest * 1.1 * 2) / 2)
    expect(plan.alerts).toContain(
      `Ta plus longue sortie du dernier mois : ${(Math.round(longest * 2) / 2).toLocaleString('fr-FR')} km. Cette semaine, aucune sortie ne dépasse ${(Math.round(longest * 1.1 * 2) / 2).toLocaleString('fr-FR')} km (+10 % au plus) : ce sont les hausses brutales qui blessent.`,
    )
  })

  test('90 % de réalisation chaque semaine (sortie longue faite en entier) : le volume monte, il ne reste pas bloqué au même niveau', () => {
    const start = profile({ level: { weeklyKm: 20, longestKm: 10, years: 1, chrono: null }, constraints: { days: [1, 3, 5, 6], longRunDay: 6, gym: false } })
    const done: DoneRun[] = []
    const planned: number[] = []
    for (let k = 0; k < 14; k++) {
      const plan = generatePlan(start, 78, done, addDays(TODAY, 7 * k))
      const w = plan.weeks[k]
      planned.push(w.km)
      // La sortie longue en entier : la raccourcir chaque semaine la bloque (règle des +10 %), et le plan le dit.
      const long = w.runs.find((x) => x.kind === 'long')?.km ?? 0
      const others = w.km - long
      for (const r of w.runs.filter((x) => x.kind !== 'cross')) done.push(run(r.day, r.kind === 'long' ? r.km : (r.km * (w.km * 0.9 - long)) / others))
    }
    expect(planned[13]).toBeGreaterThanOrEqual(planned[0] * 2)
    expect(Math.max(...planned)).toBeGreaterThanOrEqual(45)
  })

  test('une semaine manquée : pas de rattrapage, même volume', () => {
    const plan = generatePlan(p, 75, [], '2026-10-26')
    expect(plan.weeks[1].km).toBeLessThanOrEqual(week0.km + 0.5)
    expect(plan.alerts).toEqual(['Semaine manquée : on ne la rattrape pas, on reprend le plan au même volume.'])
  })

  test('deux semaines manquées : le volume redescend avant de remonter', () => {
    const plan = generatePlan(p, 75, [], '2026-11-02')
    expect(plan.weeks[2].km).toBeLessThanOrEqual(week0.km * 0.75)
    // (la semaine 3 est allégée)
    expect(plan.weeks[4].km).toBeGreaterThan(plan.weeks[2].km)
    expect(plan.alerts).toEqual(['Plus d’une semaine manquée : le volume redescend avant de remonter.'])
  })

  test('douleur au-dessus de 3 : progression gelée, séances dures remplacées, conseil de consulter', () => {
    const today = '2026-12-15' // semaine 8, en développement
    const done = [...Array.from({ length: 8 }, (_, i) => run(addDays('2026-10-25', 7 * i), 40)), run('2026-12-14', 8, 5)]
    const free = generatePlan(p, 75, done.slice(0, -1), today)
    const plan = generatePlan(p, 75, done, today)
    expect(plan.frozen).toMatch(/^Douleur 5\/10 .* consulte\.$/)
    const w = plan.weeks[8]
    expect(w.runs.some((r) => r.kind === 'cross')).toBe(true)
    expect(w.runs.some((r) => ['threshold', 'intervals'].includes(r.kind))).toBe(false)
    expect(w.km).toBeLessThanOrEqual(free.weeks[8].km)
  })

  test('douleur légère 2 sorties de suite : gelée aussi', () => {
    const plan = generatePlan(p, 75, [run('2026-10-20', 6, 2), run('2026-10-22', 6, 1)], '2026-10-23')
    expect(plan.frozen).toMatch(/^Douleur 2 sorties de suite/)
  })

  test('malade cette semaine : semaine allégée, sans séance dure ni renfo', () => {
    const plan = generatePlan({ ...p, sickWeeks: ['2026-12-14'] }, 75, [], '2026-12-15')
    const w = plan.weeks[8]
    expect(w.sick).toBe(true)
    expect(w.strength).toEqual([])
    expect(w.runs.every((r) => r.fastKm === 0)).toBe(true)
    expect(plan.alerts).toContain('Semaine déclarée malade : elle est allégée, sans séance dure ni renfo.')
  })

  test('date de course changée : plan régénéré depuis la nouvelle date, historique conservé', () => {
    const done = [run('2026-10-20', 10)]
    const moved = generatePlan({ ...p, startedOn: '2026-11-02', race: { ...p.race, day: '2027-05-02' } }, 75, done, '2026-11-03')
    expect(moved.weeks[0].start).toBe('2026-11-02')
    expect(moved.weeks.at(-1)!.runs.at(-1)!.day).toBe('2027-05-02')
    checkRules(moved, { ...p, race: { ...p.race, day: '2027-05-02' } })
  })
})

describe('recommencer le plan', () => {
  const p = profile({ startedOn: '2026-09-07', level: { weeklyKm: 15, longestKm: 8 } })
  const today = '2026-11-25' // mercredi

  test('semaine 1 cette semaine, au niveau des 4 dernières semaines courues et de la plus longue sortie du mois', () => {
    const done: DoneRun[] = [
      { day: '2026-10-20', km: 30, pain: 0 }, // plus de 4 semaines avant : ignorée
      { day: '2026-10-27', km: 8, pain: 0 },
      { day: '2026-11-01', km: 12, pain: 0 },
      { day: '2026-11-10', km: 7, pain: 0 },
      { day: '2026-11-15', km: 14.2, pain: 0 },
      { day: '2026-11-24', km: 6, pain: 0 }, // cette semaine : comptée pour la plus longue, pas pour la moyenne
    ]
    const next = restartPlan(p, done, today)
    expect(next.startedOn).toBe(today)
    // 2 semaines courues sur les 4 dernières (celles du 26 oct. et du 9 nov.) : 41,2 km / 2.
    expect(next.level.weeklyKm).toBe(21)
    expect(next.level.longestKm).toBe(14)
    expect(next.race).toEqual(p.race)
    const plan = generatePlan(next, 75, done, today)
    expect(plan.current).toBe(0)
    expect(plan.weeks[0].start).toBe('2026-11-23')
  })

  test('jamais en dessous du profil : des semaines légères ne font pas descendre de niveau (ni passer en course-marche)', () => {
    const next = restartPlan(p, [{ day: '2026-11-10', km: 3, pain: 0 }], today)
    expect(next.level).toMatchObject({ weeklyKm: 15, longestKm: 8 })
    expect(generatePlan(next, 75, [], today).walkRun).toBe(false)
  })

  test('sans sortie récente : le niveau du profil est gardé', () => {
    expect(restartPlan(p, [], today)).toEqual({ ...p, startedOn: today })
  })
})

describe('jamais trop léger : aucune sortie sous 4 km, sortie longue de 6 km au moins', () => {
  test.each([
    ['régulier, 10 km par semaine', { weeklyKm: 10, longestKm: 4 }, false],
    ['débutant (course-marche), 5 km par semaine', { weeklyKm: 5, longestKm: 3 }, true],
  ])('%s', (_, level, walkRun) => {
    const p = profile({
      race: { name: 'Marathon', day: '2027-09-26', kind: 'marathon', goalSec: null },
      level: { ...level, years: 1, chrono: null },
      constraints: { days: [1, 3, 5, 6], longRunDay: 6, gym: true },
    })
    const plan = generatePlan(p, 75, [], TODAY)
    expect(plan.walkRun).toBe(walkRun)
    expect(plan.weeks[0].km).toBeGreaterThanOrEqual(walkRun ? 14 : 19.5)
    for (const w of plan.weeks) {
      if (w.phase !== 'taper' && !w.sick) expect(w.longKm).toBeGreaterThanOrEqual(6)
      for (const r of w.runs.filter((x) => x.km > 0)) expect(r.km).toBeGreaterThanOrEqual(4)
    }
  })
})
