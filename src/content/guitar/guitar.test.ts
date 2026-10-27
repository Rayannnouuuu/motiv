import { describe, expect, test } from 'vitest'
import { EXERCISES } from '../exercises'
import { CHORDS, PATH, SCALE_SHAPES, SKILLS, getChord, type Validation } from '.'

const OPEN: Record<number, number> = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 }
const PC: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
}

/** Notes attendues de chaque accord (la première est la fondamentale). */
const EXPECTED: Record<string, string[]> = {
  Em: ['E', 'G', 'B'],
  Am: ['A', 'C', 'E'],
  E: ['E', 'G#', 'B'],
  A: ['A', 'C#', 'E'],
  D: ['D', 'F#', 'A'],
  G: ['G', 'B', 'D'],
  C: ['C', 'E', 'G'],
  Dm: ['D', 'F', 'A'],
  Em7: ['E', 'G', 'B', 'D'],
  Am7: ['A', 'C', 'E', 'G'],
  E7: ['E', 'G#', 'B', 'D'],
  A7: ['A', 'C#', 'E', 'G'],
  D7: ['D', 'F#', 'A', 'C'],
  G7: ['G', 'B', 'D', 'F'],
  C7: ['C', 'E', 'G', 'Bb'],
  B7: ['B', 'D#', 'F#', 'A'],
  Fmaj7: ['F', 'A', 'C', 'E'],
  Fsmall: ['F', 'A', 'C'],
  Gsimple: ['G', 'B', 'D'],
  Csimple: ['C', 'E', 'G'],
  Asus2: ['A', 'B', 'E'],
  Dsus2: ['D', 'E', 'A'],
  Dsus4: ['D', 'G', 'A'],
  Cadd9: ['C', 'E', 'G', 'D'],
  E5: ['E', 'B'],
  A5: ['A', 'E'],
  D5: ['D', 'A'],
  F5: ['F', 'C'],
  G5: ['G', 'D'],
  A5r6: ['A', 'E'],
  C5: ['C', 'G'],
  D5r5: ['D', 'A'],
  B5: ['B', 'F#'],
  E5oct: ['E', 'B'],
  G5oct: ['G', 'D'],
  F: ['F', 'A', 'C'],
  Fm: ['F', 'Ab', 'C'],
  Gbar: ['G', 'B', 'D'],
  Gmbar: ['G', 'Bb', 'D'],
  Abar: ['A', 'C#', 'E'],
  Ambar: ['A', 'C', 'E'],
  Bb: ['Bb', 'D', 'F'],
  Bm: ['B', 'D', 'F#'],
  Cbar: ['C', 'E', 'G'],
  Cmbar: ['C', 'Eb', 'G'],
  Dbar: ['D', 'F#', 'A'],
}

describe('accords', () => {
  test('chaque accord n’a que ses notes, avec fondamentale, tierce et septième (la quinte peut manquer), fondamentale à la basse', () => {
    for (const c of CHORDS) {
      const pitches = c.frets.flatMap((f, i) => (f === 'x' ? [] : [OPEN[6 - i] + f]))
      const want = EXPECTED[c.id]
      expect(want, c.id).toBeDefined()
      const have = new Set(pitches.map((p) => p % 12))
      const allowed = new Set(want.map((n) => PC[n]))
      expect(
        [...have].every((pc) => allowed.has(pc)),
        `${c.id} : note étrangère`,
      ).toBe(true)
      const required = c.kind === 'power' ? want : [want[0], want[1], ...(want.length === 4 ? [want[3]] : [])]
      for (const n of required) expect(have.has(PC[n]), `${c.id} : manque ${n}`).toBe(true)
      if (c.kind !== 'simplified') expect(Math.min(...pitches) % 12, `${c.id} basse`).toBe(PC[want[0]])
    }
  })

  test('doigts : aucun doigt sur une corde à vide ou étouffée, un doigt sur chaque case appuyée, barré cohérent', () => {
    for (const c of CHORDS) {
      c.frets.forEach((f, i) => {
        if (f === 'x' || f === 0) expect(c.fingers[i], `${c.id} corde ${6 - i}`).toBe(0)
        else expect(c.fingers[i], `${c.id} corde ${6 - i}`).toBeGreaterThan(0)
      })
      if (c.barre) for (let s = c.barre.toString; s <= c.barre.fromString; s++) expect(c.frets[6 - s], `${c.id} barré`).not.toBe('x')
    }
  })
})

describe('formes de gammes', () => {
  const DEG: Record<string, number> = { '1': 0, b2: 1, '2': 2, b3: 3, '3': 4, '4': 5, b5: 6, '5': 7, b6: 8, '6': 9, b7: 10, '7': 11 }
  const ROOT: Record<string, string> = { am: 'A', em: 'E', g: 'G', c: 'C', a: 'A', e: 'E' }
  test('notes montantes, degrés justes par rapport à la tonique, doigts 0 à 4', () => {
    for (const s of SCALE_SHAPES) {
      const key = s.id.split('-').find((k) => k in ROOT)!
      const root = PC[ROOT[key]]
      let last = -1
      for (const n of s.notes) {
        const p = OPEN[n.string] + n.fret
        expect(p, `${s.id} montante`).toBeGreaterThan(last)
        expect((p - root + 12) % 12, `${s.id} ${n.string}/${n.fret}`).toBe(DEG[n.degree])
        expect(n.finger).toBeGreaterThanOrEqual(0)
        expect(n.finger).toBeLessThanOrEqual(4)
        last = p
      }
    }
  })
  test('pentatonique mineure de La, position 1 : le doigté classique', () => {
    const pos1 = SCALE_SHAPES.find((s) => s.id === 'penta-am-1')!
    expect(pos1.notes.map((n) => `${n.string}:${n.fret}`)).toEqual(['6:5', '6:8', '5:5', '5:7', '4:5', '4:7', '3:5', '3:7', '2:5', '2:8', '1:5', '1:8'])
  })
})

describe('parcours', () => {
  const ids = new Set(SKILLS.map((s) => s.id))
  const exercises = new Set(EXERCISES.map((e) => e.id))
  test('6 niveaux, ids uniques, chaque compétence dans son niveau', () => {
    expect(PATH.levels.map((l) => l.level)).toEqual([0, 1, 2, 3, 4, 5])
    expect(ids.size).toBe(SKILLS.length)
    for (const l of PATH.levels) expect(l.requiredSkillIds.every((id) => SKILLS.find((s) => s.id === id)?.level === l.level)).toBe(true)
  })

  test('prérequis existants, d’un niveau inférieur ou égal, sans boucle', () => {
    for (const s of SKILLS) for (const p of s.prerequisites) expect(SKILLS.find((x) => x.id === p)?.level, `${s.id} ← ${p}`).toBeLessThanOrEqual(s.level)
    const seen = new Set<string>()
    const visit = (id: string, stack: string[]) => {
      expect(stack, `boucle ${[...stack, id].join(' → ')}`).not.toContain(id)
      if (seen.has(id)) return
      for (const p of SKILLS.find((x) => x.id === id)!.prerequisites) visit(p, [...stack, id])
      seen.add(id)
    }
    for (const s of SKILLS) visit(s.id, [])
  })

  test('exercices, accords, quiz et grilles cités existent', () => {
    const quizzes = new Set(PATH.quizzes.map((q) => q.id))
    const rubrics = new Set(PATH.rubrics.map((r) => r.id))
    for (const s of SKILLS) {
      for (const e of s.exerciseIds) expect(exercises.has(e), `${s.id} → ${e}`).toBe(true)
      const v: Validation = s.validation
      if (v.kind === 'tempo') expect(exercises.has(v.exerciseId), `${s.id} → ${v.exerciseId}`).toBe(true)
      if (v.kind === 'changes_per_minute') for (const pair of v.chords) for (const c of pair) expect(getChord(c), `${s.id} → ${c}`).toBeDefined()
      if (v.kind === 'quiz') expect(quizzes.has(v.quizId)).toBe(true)
      if (v.kind === 'recording') expect(rubrics.has(v.rubricId)).toBe(true)
      expect(s.tips.length, s.id).toBeGreaterThanOrEqual(1)
    }
  })

  test('chaque niveau couvre au moins 3 piliers ; le niveau 0 n’a aucun prérequis', () => {
    for (const l of PATH.levels) expect(new Set(SKILLS.filter((s) => s.level === l.level).map((s) => s.pillar)).size).toBeGreaterThanOrEqual(3)
    expect(SKILLS.filter((s) => s.level === 0 && s.prerequisites.length > 0)).toEqual([])
  })
})
