import { expect, test } from 'vitest'
import { getExercise } from '../content/exercises'
import { ex, gs, mkSong, set, song, ss } from '../test/factories'
import { guitarSessionXp, sportSessionXp } from './xp'

test('1 XP par minute', () => {
  const r = guitarSessionXp({ durationMin: 45, items: [] }, [], [])
  expect(r.total).toBe(45)
  expect(r.lines).toEqual([{ label: '45 min jouées', xp: 45 }])
})

test('premier tempo sur un exo ≠ record ; tempo supérieur = +10', () => {
  expect(guitarSessionXp({ durationMin: 0, items: [ex('legato-4', 90)] }, [], []).total).toBe(0)
  const h = [gs([ex('legato-4', 90)])]
  const r = guitarSessionXp({ durationMin: 0, items: [ex('legato-4', 96)] }, h, [])
  expect(r.total).toBe(10)
  expect(r.lines).toContainEqual({ label: `Record de tempo · ${getExercise('legato-4')!.title}`, xp: 10 })
  expect(guitarSessionXp({ durationMin: 0, items: [ex('legato-4', 90)] }, h, []).total).toBe(0)
})

test('un exo présent deux fois dans la session compte une fois', () => {
  const h = [gs([ex('legato-4', 90)])]
  expect(guitarSessionXp({ durationMin: 0, items: [ex('legato-4', 96), ex('legato-4', 100)] }, h, []).total).toBe(10)
})

test('bonus difficulté +50 seulement au-delà du max déjà travaillé dans la catégorie', () => {
  expect(guitarSessionXp({ durationMin: 0, items: [ex('scales-1', null)] }, [], []).total).toBe(0)
  const r = guitarSessionXp({ durationMin: 0, items: [ex('scales-2', null)] }, [gs([ex('scales-1', null)])], [])
  expect(r.total).toBe(50)
  expect(r.lines).toContainEqual({ label: 'Difficulté en hausse · Gammes', xp: 50 })
  expect(guitarSessionXp({ durationMin: 0, items: [ex('scales-1', null)] }, [gs([ex('scales-2', null)])], []).total).toBe(0)
})

test('morceau passé à maîtrisé = +100, déjà maîtrisé = 0', () => {
  const learning = mkSong({ id: 's1', title: 'Paranoid' })
  const r = guitarSessionXp({ durationMin: 0, items: [song('s1', true)] }, [], [learning])
  expect(r.total).toBe(100)
  expect(r.lines).toContainEqual({ label: 'Morceau maîtrisé · Paranoid', xp: 100 })
  expect(guitarSessionXp({ durationMin: 0, items: [song('s1', true)] }, [], [{ ...learning, status: 'mastered' }]).total).toBe(0)
  expect(guitarSessionXp({ durationMin: 0, items: [song('s1', false)] }, [], [learning]).total).toBe(0)
})

test('morceau nouveau (pas encore dans la liste) marqué maîtrisé = +100', () => {
  expect(guitarSessionXp({ durationMin: 0, items: [song('new', true)] }, [], []).total).toBe(100)
})

test('exo inconnu : aucun bonus', () => {
  const h = [gs([ex('ghost-1', 90)])]
  expect(guitarSessionXp({ durationMin: 0, items: [ex('ghost-1', 120)] }, h, []).total).toBe(0)
})

test('séance sport : +60, +15 par exo avec au moins un record', () => {
  const h = [ss([set(60, 8, 'pe1'), set(30, 10, 'pe2')])]
  const r = sportSessionXp({ sets: [set(62.5, 8, 'pe1'), set(62.5, 8, 'pe1', 2), set(30, 10, 'pe2')] }, h, () => 'Développé couché')
  expect(r.total).toBe(75)
  expect(r.lines).toEqual([
    { label: 'Séance terminée', xp: 60 },
    { label: 'Record · Développé couché', xp: 15 },
  ])
})
