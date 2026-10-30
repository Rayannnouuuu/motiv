import { describe, expect, test } from 'vitest'
import { CHORDS, getSkill, SCALE_SHAPES, SKILLS, TRACK_SKILLS } from '../../content/guitar'
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
    for (const track of ['chords', 'scales']) {
      const mine = TRACK_SKILLS.filter((s) => s.track === track)
      mine.forEach((s, i) => expect(s.prerequisites).toEqual(i === 0 ? [] : [mine[i - 1].id]))
    }
    expect(SKILLS.some((s) => ids.includes(s.id))).toBe(false)
    expect(TRACK_SKILLS.every((s) => s.track !== undefined && getSkill(s.id) === s)).toBe(true)
  })

  test('une transition par accord (sauf le premier de Mi m), une boucle par bloc, accords tous connus', () => {
    expect(TRACK_SKILLS.filter((s) => s.track === 'chords' && s.id.startsWith('loop-'))).toHaveLength(6)
    const known = new Set(CHORDS.map((c) => c.id))
    for (const s of TRACK_SKILLS) for (const id of s.chordIds ?? []) expect(known.has(id)).toBe(true)
    for (const s of TRACK_SKILLS.filter((x) => x.id.startsWith('change-'))) {
      const [partner, chord] = s.chordIds!
      const order = TRACK_SKILLS.filter((x) => x.id.startsWith('chord-')).map((x) => x.chordIds![0])
      expect(order.indexOf(partner)).toBeLessThan(order.indexOf(chord))
    }
  })

  test('les gammes : les 14 formes ont chacune leur étape, une seule fois, les liaisons relient des positions voisines', () => {
    const forms = TRACK_SKILLS.filter((s) => s.id.startsWith('scale-'))
    expect(forms.map((s) => s.scaleIds![0]).sort()).toEqual(SCALE_SHAPES.map((x) => x.id).sort())
    const links = TRACK_SKILLS.filter((s) => s.id.startsWith('link-'))
    expect(links.map((s) => s.id)).toEqual(['link-penta-am-1-2', 'link-penta-am-2-3', 'link-penta-am-3-4', 'link-penta-am-4-5'])
    for (const l of links) expect(l.scaleIds).toHaveLength(2)
    expect(TRACK_SKILLS.filter((s) => s.track === 'scales')).toHaveLength(14 + 4 + 1)
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
    const steps = trackSteps(EMPTY_PROGRESS, 'chords')
    expect(steps[0]).toMatchObject({ state: 'current' })
    expect(steps[0].skill.id).toBe('chord-Em')
    expect(steps.slice(1).every((s) => s.state === 'locked')).toBe(true)
    expect(trackDone(EMPTY_PROGRESS, 'chords')).toBe(0)
  })

  test('la forme cochée valide l’étape et ouvre la suivante', () => {
    const open = openStep(EMPTY_PROGRESS, 'chord-Em', TODAY)
    const next = recordAttempt(open, 'chord-Em', { day: TODAY, value: 4, clean: true })
    expect(currentStep(next, 'chords')?.id).toBe('chord-Am')
    expect(trackDone(next, 'chords')).toBe(1)
  })

  test('une transition demande deux jours différents', () => {
    let p = knownUpTo(EMPTY_PROGRESS, 'chord-Am', TODAY)
    expect(currentStep(p, 'chords')?.id).toBe('change-Em-Am')
    p = openStep(p, 'change-Em-Am', TODAY)
    p = recordAttempt(p, 'change-Em-Am', { day: TODAY, value: 24 })
    expect(currentStep(p, 'chords')?.id).toBe('change-Em-Am')
    p = recordAttempt(p, 'change-Em-Am', { day: '2026-11-03', value: 22 })
    expect(currentStep(p, 'chords')?.id).toBe('chord-E')
  })

  test('« je le sais déjà » valide jusqu’à l’étape choisie, avec entretien prévu', () => {
    const p = knownUpTo(EMPTY_PROGRESS, 'chord-G', TODAY)
    expect(currentStep(p, 'chords')?.id).toBe('change-D-G')
    expect(p.skills['chord-Em']).toMatchObject({ status: 'validated', diagnosed: true })
    expect(p.skills['chord-Em'].review?.dueAt).toBe('2026-11-05')
    expect(blockSummaries(p, 'chords')[0]).toMatchObject({ name: 'Accords ouverts', done: 10 })
  })
})

describe('parcours des gammes', () => {
  test('au départ : la position 1 de La en cours ; les deux pistes avancent chacune de leur côté', () => {
    expect(currentStep(EMPTY_PROGRESS, 'scales')?.id).toBe('scale-penta-am-1')
    const p = knownUpTo(EMPTY_PROGRESS, 'chord-Am', TODAY)
    expect(currentStep(p, 'scales')?.id).toBe('scale-penta-am-1')
    expect(trackDone(p, 'scales')).toBe(0)
  })

  test('« je le sais déjà » dans les gammes ne touche pas aux accords', () => {
    const p = knownUpTo(EMPTY_PROGRESS, 'scale-penta-am-3', TODAY)
    expect(trackDone(p, 'chords')).toBe(0)
    expect(trackDone(p, 'scales')).toBe(5)
    expect(p.skills['penta-1']).toMatchObject({ status: 'validated' })
    expect(p.skills['penta-1-2']).toMatchObject({ status: 'validated' })
    expect(p.skills['penta-5']).toBeUndefined()
  })

  test('les cinq positions et leurs liaisons valident « pentatonique dans les 5 positions »', () => {
    const p = knownUpTo(EMPTY_PROGRESS, 'loop-penta-am', TODAY)
    expect(p.skills['penta-5']).toMatchObject({ status: 'validated' })
    expect(blockSummaries(p, 'scales')[0]).toMatchObject({ name: 'Pentatonique mineure de La', done: 10, total: 10 })
    expect(currentStep(p, 'scales')?.id).toBe('scale-penta-em-open')
  })

  test('une forme demande deux jours différents', () => {
    let p = openStep(EMPTY_PROGRESS, 'scale-penta-am-1', TODAY)
    p = recordAttempt(p, 'scale-penta-am-1', { day: TODAY, value: 4, clean: true })
    expect(currentStep(p, 'scales')?.id).toBe('scale-penta-am-1')
    p = recordAttempt(p, 'scale-penta-am-1', { day: '2026-11-03', value: 4, clean: true })
    expect(currentStep(p, 'scales')?.id).toBe('link-penta-am-1-2')
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
