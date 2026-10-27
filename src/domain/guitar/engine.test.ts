import { describe, expect, test } from 'vitest'
import { getExercise } from '../../content/exercises'
import { getSkill, SKILLS } from '../../content/guitar'
import { addDays } from '../date'
import {
  beginnerMinutes,
  diagnose,
  dueReviews,
  EMPTY_PROGRESS,
  examAvailable,
  exerciseLevel,
  learning,
  offPath,
  passes,
  passExam,
  pathLevel,
  plateau,
  playability,
  recordAttempt,
  recordSetup,
  skillStatus,
  startSkill,
  suggestNext,
  tempoProposal,
  unlockedExercises,
  type GuitarProgress,
} from './engine'

const D0 = '2026-11-02'
const day = (n: number) => addDays(D0, n)
const s = (id: string) => getSkill(id)!

describe('états et démarrage', () => {
  test('niveau 0 disponible d’emblée, le reste verrouillé tant que les prérequis ne sont pas validés', () => {
    expect(skillStatus(s('tune'), EMPTY_PROGRESS)).toBe('available')
    expect(skillStatus(s('open-chords'), EMPTY_PROGRESS)).toBe('locked')
    const p = diagnose(EMPTY_PROGRESS, ['chromatic-quarter', 'reading'], D0)
    expect(skillStatus(s('open-chords'), p)).toBe('available')
  })

  test('3 compétences en cours au maximum ; une verrouillée ne démarre pas ; la mise en place ne compte pas dans les 3', () => {
    let p = diagnose(EMPTY_PROGRESS, ['chromatic-quarter', 'reading'], D0)
    for (const id of ['open-chords', 'chromatic-eighth', 'power-chords']) p = startSkill(p, id, D0)
    expect(learning(p)).toHaveLength(3)
    expect(() => startSkill(p, 'notes-low', D0)).toThrow(/Déjà 3/)
    expect(() => startSkill(EMPTY_PROGRESS, 'changes', D0)).toThrow(/verrouillée/)
    p = recordSetup(p, 'tune', D0)
    expect(learning(p)).toHaveLength(3)
  })

  test('mise en place (accordage, son clair, posture) : validée en 2 jours, jamais proposée ni dans la séance', () => {
    let p = EMPTY_PROGRESS
    for (const id of ['tune', 'clean-tone', 'posture']) p = recordSetup(p, id, D0)
    expect(p.skills.tune.status).toBe('learning')
    for (const id of ['tune', 'clean-tone', 'posture']) p = recordSetup(p, id, day(1))
    expect(['tune', 'clean-tone', 'posture'].map((id) => p.skills[id].status)).toEqual(['validated', 'validated', 'validated'])
    expect(suggestNext(EMPTY_PROGRESS).some((x) => x.setup)).toBe(false)
    expect(dueReviews(p, day(30))).toEqual([])
  })
})

describe('validation', () => {
  test('tempo : il faut la vitesse ET propre', () => {
    const v = s('chromatic-quarter').validation
    expect(passes(v, { day: D0, value: 60, clean: true })).toBe(true)
    expect(passes(v, { day: D0, value: 60, clean: false })).toBe(false)
    expect(passes(v, { day: D0, value: 56, clean: true })).toBe(false)
  })

  test('validée seulement sur des jours différents (3 pour un tempo), jamais dans une seule séance', () => {
    let p = startSkill(EMPTY_PROGRESS, 'chromatic-quarter', D0)
    for (let i = 0; i < 4; i++) p = recordAttempt(p, 'chromatic-quarter', { day: D0, value: 60, clean: true })
    expect(p.skills['chromatic-quarter'].status).toBe('learning')
    p = recordAttempt(p, 'chromatic-quarter', { day: day(1), value: 62, clean: true })
    p = recordAttempt(p, 'chromatic-quarter', { day: day(3), value: 60, clean: true })
    expect(p.skills['chromatic-quarter']).toMatchObject({ status: 'validated', validatedAt: day(3), best: 62, review: { dueAt: day(6), intervalDays: 3 } })
  })

  test('quiz : score ET temps par question ; changements par minute ; bends sur 10 ; grille', () => {
    expect(passes(s('notes-low').validation, { day: D0, value: 95, seconds: 2.5 })).toBe(true)
    expect(passes(s('notes-low').validation, { day: D0, value: 95, seconds: 4 })).toBe(false)
    expect(passes(s('changes').validation, { day: D0, value: 30 })).toBe(true)
    expect(passes(s('bends').validation, { day: D0, value: 7 })).toBe(false)
    expect(passes(s('first-song').validation, { day: D0, value: 2.2 })).toBe(true)
  })
})

describe('tempo proposé', () => {
  const sk = s('chromatic-quarter')
  const withTries = (tries: [number, boolean][]) => {
    let p = startSkill(EMPTY_PROGRESS, sk.id, D0)
    tries.forEach(([value, clean], i) => (p = recordAttempt(p, sk.id, { day: day(i), value, clean })))
    return p.skills[sk.id]
  }
  test('premier essai : le tempo de départ de l’exercice', () => {
    expect(tempoProposal(sk, undefined)).toMatchObject({ bpm: getExercise('chromatic-1')!.startBpm })
  })
  test('3 séances propres : +4 bpm ; 2 pas propres : −10 %', () => {
    expect(
      tempoProposal(
        sk,
        withTries([
          [52, true],
          [52, true],
          [53, true],
        ]),
      )!.bpm,
    ).toBe(56)
    expect(
      tempoProposal(
        sk,
        withTries([
          [52, true],
          [60, false],
          [60, false],
        ]),
      )!.bpm,
    ).toBe(54)
    expect(
      tempoProposal(
        sk,
        withTries([
          [52, true],
          [52, false],
        ]),
      )!.bpm,
    ).toBe(52)
  })
})

describe('entretien espacé', () => {
  const validated = () => diagnose(EMPTY_PROGRESS, ['tune'], D0)
  test('3, 7, 14, 30 puis 60 jours si réussi', () => {
    let p = validated()
    const due: string[] = []
    let today = D0
    for (let i = 0; i < 6; i++) {
      today = p.skills.tune.review!.dueAt
      due.push(today)
      p = recordAttempt(p, 'tune', { day: today, value: 1, clean: true })
    }
    expect(due).toEqual([day(3), day(10), day(24), day(54), day(114), day(174)])
    expect(dueReviews(p, today)).toEqual([])
  })
  test('raté : retour à 3 jours, « à consolider », mais toujours validée', () => {
    let p = validated()
    p = recordAttempt(p, 'tune', { day: day(3), value: 0, clean: false })
    expect(p.skills.tune).toMatchObject({ status: 'validated', fragile: true, review: { dueAt: day(6), intervalDays: 3, lapses: 1 } })
    p = recordAttempt(p, 'tune', { day: day(6), value: 1, clean: true })
    expect(p.skills.tune).toMatchObject({ fragile: false, review: { intervalDays: 7 } })
  })
  test('entretiens dus : les plus en retard d’abord', () => {
    const p = diagnose(diagnose(EMPTY_PROGRESS, ['reading'], D0), ['chromatic-quarter'], day(1))
    expect(dueReviews(p, day(10)).map((x) => x.skillId)).toEqual(['reading', 'chromatic-quarter'])
    expect(dueReviews(p, day(2))).toEqual([])
  })
})

describe('plateau', () => {
  test('6 essais sans nouveau record : ralentir, découper, variante, posture (dans cet ordre)', () => {
    let p = startSkill(EMPTY_PROGRESS, 'chromatic-quarter', D0)
    p = recordAttempt(p, 'chromatic-quarter', { day: D0, value: 58, clean: true })
    for (let i = 1; i <= 6; i++) p = recordAttempt(p, 'chromatic-quarter', { day: day(i), value: 56, clean: false })
    const tips = plateau(s('chromatic-quarter'), p.skills['chromatic-quarter'])!
    expect(tips[0]).toBe('Ralentis de 20 % : 46 bpm, très propre.')
    expect(tips[1]).toMatch(/^Découpe/)
    expect(tips[2]).toMatch(/^Change de variante : Chromatique/)
    expect(tips[3]).toMatch(/posture/)
  })
  test('un nouveau record récent : pas de plateau', () => {
    let p = startSkill(EMPTY_PROGRESS, 'chromatic-quarter', D0)
    for (let i = 0; i < 7; i++) p = recordAttempt(p, 'chromatic-quarter', { day: day(i), value: 50 + i, clean: true })
    expect(plateau(s('chromatic-quarter'), p.skills['chromatic-quarter'])).toBeNull()
  })
})

describe('choix de la suivante, diagnostic, niveau, jouabilité', () => {
  test('suggestion : niveau en cours d’abord, piliers les moins occupés en tête', () => {
    let p = startSkill(EMPTY_PROGRESS, 'chromatic-quarter', D0)
    const next = suggestNext(p)
    expect(next.every((x) => x.level === 0)).toBe(true)
    expect(next[0].pillar).not.toBe('left_hand')
    p = diagnose(
      EMPTY_PROGRESS,
      SKILLS.filter((x) => x.level === 0).map((x) => x.id),
      D0,
    )
    expect(suggestNext(p).every((x) => x.level === 1)).toBe(true)
  })

  test('diagnostic : tout le niveau 0 validé d’avance → niveau du parcours 1, exercices du niveau 1 débloqués', () => {
    expect(pathLevel(EMPTY_PROGRESS)).toBe(0)
    expect(
      unlockedExercises(EMPTY_PROGRESS)
        .map((e) => e.id)
        .sort(),
    ).toEqual(['chromatic-1', 'chromatic-2', 'strumming-1'])
    const p = diagnose(
      EMPTY_PROGRESS,
      SKILLS.filter((x) => x.level === 0).map((x) => x.id),
      D0,
    )
    expect(pathLevel(p)).toBe(1)
    expect(unlockedExercises(p).some((e) => e.id === 'powerChords-2')).toBe(true)
    expect(unlockedExercises(p).some((e) => e.id === 'scales-103')).toBe(false)
  })

  test('épreuve : disponible quand tout le niveau est validé, réussie elle fait passer le niveau', () => {
    let p = EMPTY_PROGRESS
    for (const x of SKILLS.filter((k) => k.level === 0)) {
      p = startSkill({ ...p, skills: Object.fromEntries(Object.entries(p.skills).filter(([, v]) => v.status !== 'learning')) }, x.id, D0)
      for (let i = 0; i < 3; i++) p = recordAttempt(p, x.id, { day: day(i), value: 100, clean: true, seconds: 1 })
    }
    expect(pathLevel(p)).toBe(0)
    expect(examAvailable(p, 0)).toBe(true)
    p = passExam(p, 0, day(5))
    expect(pathLevel(p)).toBe(1)
    expect(() => passExam(p, 1, day(5))).toThrow()
  })

  test('niveau d’un exercice : par ses compétences, sinon par sa difficulté (hors parcours)', () => {
    expect(exerciseLevel(getExercise('chromatic-1')!)).toBe(0)
    expect(exerciseLevel(getExercise('sweep-10')!)).toBe(5)
    expect(offPath(getExercise('sweep-10')!)).toBe(true)
    expect(offPath(getExercise('palmMuting-1')!)).toBe(false)
  })

  test('jouabilité : 80 % prêt à apprendre, 100 % à ta portée', () => {
    const p = diagnose(EMPTY_PROGRESS, ['open-chords', 'changes', 'eighths', 'strum-pattern'], D0)
    expect(playability(['open-chords', 'changes', 'eighths', 'strum-pattern'], p).label).toBe('à ta portée')
    expect(playability(['open-chords', 'changes', 'eighths', 'strum-pattern', 'palm-mute'], p)).toEqual({ ratio: 0.8, label: 'prêt à apprendre' })
    expect(playability(['palm-mute', 'open-chords'], p).label).toBeNull()
  })

  test('débutant : 15 à 20 min les 3 premières semaines', () => {
    expect(beginnerMinutes(D0, day(20))).toEqual({ min: 15, max: 20 })
    expect(beginnerMinutes(D0, day(21))).toBeNull()
    expect(beginnerMinutes(null, D0)).toBeNull()
  })
})

/**
 * 8 semaines d'un débutant, 5 séances par semaine : il garde toujours 3 compétences en cours (celles proposées),
 * progresse d'un essai à l'autre (tempo +2 bpm par séance réussie, quiz et compteurs qui montent), passe les
 * entretiens dus. Le moteur doit respecter ses règles du début à la fin.
 */
describe('simulation : 8 semaines de débutant', () => {
  test('le moteur se comporte comme décrit', () => {
    let p: GuitarProgress = EMPTY_PROGRESS
    const skill = (id: string) => getSkill(id)!
    const level = new Map<string, number>()
    const sessions: string[] = []
    for (let week = 0; week < 8; week++)
      for (let d = 0; d < 5; d++) {
        const today = day(week * 7 + d)
        sessions.push(today)
        for (const id of ['tune', 'clean-tone', 'posture']) p = recordSetup(p, id, today)
        while (learning(p).length < 3 && suggestNext(p).length) p = startSkill(p, suggestNext(p)[0].id, today)
        expect(learning(p).length).toBeLessThanOrEqual(3)
        for (const l of learning(p)) {
          const v = skill(l.skillId).validation
          const n = (level.get(l.skillId) ?? 0) + 1
          level.set(l.skillId, n)
          const value =
            v.kind === 'tempo'
              ? Math.min(v.bpm + 4, 44 + n * 4)
              : v.kind === 'changes_per_minute'
                ? 14 + n * 3
                : v.kind === 'quiz'
                  ? 60 + n * 10
                  : v.kind === 'pitch'
                    ? 5 + n
                    : v.kind === 'recording'
                      ? 1.5 + n * 0.2
                      : n
          p = recordAttempt(p, l.skillId, { day: today, value, clean: v.kind === 'checklist' ? n >= 2 : true, seconds: 2 })
        }
        for (const r of dueReviews(p, today)) p = recordAttempt(p, r.skillId, { day: today, value: 999, clean: true, seconds: 1 })
        for (const lv of [0, 1, 2]) if (examAvailable(p, lv)) p = passExam(p, lv, today)
      }

    const validated = Object.values(p.skills).filter((x) => x.status === 'validated')
    // Jamais validée en une seule séance : au moins le nombre de jours demandés, tous avant la validation.
    for (const v of validated) {
      const days = new Set(v.attempts.filter((a) => a.passed && a.day <= v.validatedAt!).map((a) => a.day))
      expect(days.size, v.skillId).toBeGreaterThanOrEqual(
        'sessions' in skill(v.skillId).validation ? (skill(v.skillId).validation as { sessions: number }).sessions : 1,
      )
      // Prérequis validés avant de commencer.
      for (const pre of skill(v.skillId).prerequisites) expect(p.skills[pre].validatedAt! <= v.startedAt, `${v.skillId} ← ${pre}`).toBe(true)
    }
    // Le niveau 0 est fini et son épreuve passée ; le débutant travaille au moins le niveau 1.
    expect(SKILLS.filter((x) => x.level === 0).every((x) => p.skills[x.id]?.status === 'validated')).toBe(true)
    expect(pathLevel(p)).toBeGreaterThanOrEqual(1)
    expect(validated.length).toBeGreaterThanOrEqual(10)
    // Entretiens : chaque compétence validée a un prochain entretien dans le futur ou aujourd'hui, à un intervalle prévu.
    for (const v of validated) expect([3, 7, 14, 30, 60]).toContain(v.review!.intervalDays)
    expect(dueReviews(p, sessions.at(-1)!)).toEqual([])
    expect(sessions).toHaveLength(40)
  })
})
