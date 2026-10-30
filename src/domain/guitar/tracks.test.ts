import { describe, expect, test } from 'vitest'
import { CHORDS, getSkill, SKILLS, TRACK_SKILLS } from '../../content/guitar'
import { PATH_COVERS } from '../../content/guitar/tracks'
import { EMPTY_PROGRESS, learning, recordAttempt, startSkill, suggestNext } from './engine'
import { blockSummaries, currentStep, knownUpTo, openStep, syncPath, trackDone, trackSteps } from './tracks'

const TODAY = '2026-11-02'

describe('contenu du parcours des accords', () => {
  test('les 46 accords ont chacun leur forme, une seule fois', () => {
    const forms = TRACK_SKILLS.filter((s) => s.id.startsWith('chord-'))
    expect(forms).toHaveLength(CHORDS.length)
    expect(new Set(forms.map((s) => s.chordIds![0]))).toEqual(new Set(CHORDS.map((c) => c.id)))
  })

  test('chaque étape demande la précédente ; identifiants uniques et jamais ceux du parcours général', () => {
    const ids = TRACK_SKILLS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    TRACK_SKILLS.forEach((s, i) => expect(s.prerequisites).toEqual(i === 0 ? [] : [ids[i - 1]]))
    expect(SKILLS.some((s) => ids.includes(s.id))).toBe(false)
    expect(TRACK_SKILLS.every((s) => s.track === 'chords' && getSkill(s.id) === s)).toBe(true)
  })

  test('une transition par accord (sauf le premier de Mi m), une boucle par bloc, accords tous connus', () => {
    expect(TRACK_SKILLS.filter((s) => s.id.startsWith('loop-'))).toHaveLength(6)
    const known = new Set(CHORDS.map((c) => c.id))
    for (const s of TRACK_SKILLS) for (const id of s.chordIds!) expect(known.has(id)).toBe(true)
    for (const s of TRACK_SKILLS.filter((x) => x.id.startsWith('change-'))) {
      const [partner, chord] = s.chordIds!
      const order = TRACK_SKILLS.filter((x) => x.id.startsWith('chord-')).map((x) => x.chordIds![0])
      expect(order.indexOf(partner)).toBeLessThan(order.indexOf(chord))
    }
  })

  test('les grosses étapes couvertes existent, et leurs étapes aussi', () => {
    for (const [pathId, covers] of Object.entries(PATH_COVERS)) {
      expect(SKILLS.some((s) => s.id === pathId)).toBe(true)
      for (const id of covers) expect(TRACK_SKILLS.some((s) => s.id === id)).toBe(true)
    }
  })
})

describe('états et déblocage', () => {
  test('au départ : Mi m en cours, tout le reste verrouillé', () => {
    const steps = trackSteps(EMPTY_PROGRESS)
    expect(steps[0]).toMatchObject({ state: 'current' })
    expect(steps[0].skill.id).toBe('chord-Em')
    expect(steps.slice(1).every((s) => s.state === 'locked')).toBe(true)
    expect(trackDone(EMPTY_PROGRESS)).toBe(0)
  })

  test('la forme cochée valide l’étape et ouvre la suivante', () => {
    const open = openStep(EMPTY_PROGRESS, 'chord-Em', TODAY)
    const next = recordAttempt(open, 'chord-Em', { day: TODAY, value: 4, clean: true })
    expect(currentStep(next)?.id).toBe('chord-Am')
    expect(trackDone(next)).toBe(1)
  })

  test('une transition demande deux jours différents', () => {
    let p = knownUpTo(EMPTY_PROGRESS, 'chord-Am', TODAY)
    expect(currentStep(p)?.id).toBe('change-Em-Am')
    p = openStep(p, 'change-Em-Am', TODAY)
    p = recordAttempt(p, 'change-Em-Am', { day: TODAY, value: 24 })
    expect(currentStep(p)?.id).toBe('change-Em-Am')
    p = recordAttempt(p, 'change-Em-Am', { day: '2026-11-03', value: 22 })
    expect(currentStep(p)?.id).toBe('chord-E')
  })

  test('« je le sais déjà » valide jusqu’à l’étape choisie, avec entretien prévu', () => {
    const p = knownUpTo(EMPTY_PROGRESS, 'chord-G', TODAY)
    expect(currentStep(p)?.id).toBe('change-D-G')
    expect(p.skills['chord-Em']).toMatchObject({ status: 'validated', diagnosed: true })
    expect(p.skills['chord-Em'].review?.dueAt).toBe('2026-11-05')
    expect(blockSummaries(p)[0]).toMatchObject({ name: 'Accords ouverts', done: 10 })
  })
})

describe('liens avec le parcours général', () => {
  test('les étapes du parcours ne comptent pas parmi les 3 compétences en cours ni dans les suggestions', () => {
    let p = openStep(EMPTY_PROGRESS, 'chord-Em', TODAY)
    expect(learning(p)).toHaveLength(0)
    for (const id of ['tune', 'clean-tone', 'posture']) expect(id).toBeTruthy()
    p = startSkill(p, 'chromatic-quarter', TODAY)
    p = startSkill(p, 'downstrokes', TODAY)
    p = startSkill(p, 'reading', TODAY)
    expect(learning(p)).toHaveLength(3)
    expect(suggestNext(p).some((s) => s.track)).toBe(false)
  })

  test('« Accords ouverts » se valide quand ses 7 accords sont faits', () => {
    const mid = knownUpTo(EMPTY_PROGRESS, 'chord-A', TODAY)
    expect(mid.skills['open-chords']).toBeUndefined()
    const all = knownUpTo(mid, 'chord-C', TODAY)
    expect(all.skills['open-chords']).toMatchObject({ status: 'validated' })
    expect(all.skills['open-chords'].diagnosed).toBeUndefined()
  })

  test('une grosse étape déjà validée autrement est laissée telle quelle', () => {
    const before = {
      ...EMPTY_PROGRESS,
      skills: { 'open-chords': { skillId: 'open-chords', status: 'learning' as const, fragile: false, startedAt: '2026-10-01', attempts: [] } },
    }
    const after = syncPath(knownUpTo(before, 'chord-C', TODAY), TODAY)
    expect(after.skills['open-chords'].status).toBe('validated')
  })
})
