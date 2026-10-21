import { expect, test } from 'vitest'
import { getExercise } from '../content/exercises'
import { ex, gs, mkSong, set, song, ss } from '../test/factories'
import { guitarSessionXp, runXp, sportSessionXp } from './xp'

test('le temps ne rapporte plus d’XP : seule la progression compte', () => {
  expect(guitarSessionXp({ items: [] }, [], [])).toEqual({ total: 0, lines: [] })
})

test('premier tempo sur un exo ≠ record ; tempo supérieur = +20', () => {
  expect(guitarSessionXp({ items: [ex('legato-4', 90)] }, [], []).total).toBe(0)
  const h = [gs([ex('legato-4', 90)])]
  const r = guitarSessionXp({ items: [ex('legato-4', 96)] }, h, [])
  expect(r.total).toBe(20)
  expect(r.lines).toContainEqual({ label: `Record de tempo · ${getExercise('legato-4')!.title}`, xp: 20 })
  expect(guitarSessionXp({ items: [ex('legato-4', 90)] }, h, []).total).toBe(0)
})

test('un exo présent deux fois dans la session compte une fois', () => {
  const h = [gs([ex('legato-4', 90)])]
  expect(guitarSessionXp({ items: [ex('legato-4', 96), ex('legato-4', 100)] }, h, []).total).toBe(20)
})

test('bonus difficulté +50 seulement au-delà du max déjà travaillé dans la catégorie', () => {
  expect(guitarSessionXp({ items: [ex('scales-1', null)] }, [], []).total).toBe(0)
  const r = guitarSessionXp({ items: [ex('scales-2', null)] }, [gs([ex('scales-1', null)])], [])
  expect(r.total).toBe(50)
  expect(r.lines).toContainEqual({ label: 'Difficulté en hausse · Gammes', xp: 50 })
  expect(guitarSessionXp({ items: [ex('scales-1', null)] }, [gs([ex('scales-2', null)])], []).total).toBe(0)
})

test('morceau passé à maîtrisé = +100, déjà maîtrisé = 0', () => {
  const learning = mkSong({ id: 's1', title: 'Paranoid' })
  const r = guitarSessionXp({ items: [song('s1', true)] }, [], [learning])
  expect(r.total).toBe(100)
  expect(r.lines).toContainEqual({ label: 'Morceau maîtrisé · Paranoid', xp: 100 })
  expect(guitarSessionXp({ items: [song('s1', true)] }, [], [{ ...learning, status: 'mastered' }]).total).toBe(0)
  expect(guitarSessionXp({ items: [song('s1', false)] }, [], [learning]).total).toBe(0)
})

test('morceau nouveau (pas encore dans la liste) marqué maîtrisé = +100', () => {
  expect(guitarSessionXp({ items: [song('new', true)] }, [], []).total).toBe(100)
})

test('exo inconnu : aucun bonus', () => {
  const h = [gs([ex('ghost-1', 90)])]
  expect(guitarSessionXp({ items: [ex('ghost-1', 120)] }, h, []).total).toBe(0)
})

test('séance sport : +20 par exo avec au moins un record, rien pour la séance seule', () => {
  const h = [ss([set(60, 8, 'pe1'), set(30, 10, 'pe2')])]
  const r = sportSessionXp({ sets: [set(62.5, 8, 'pe1'), set(62.5, 8, 'pe1', 2), set(30, 10, 'pe2')] }, h, () => 'Développé couché')
  expect(r).toEqual({ total: 20, lines: [{ label: 'Record · Développé couché', xp: 20 }] })
})

test('sortie de course : plus longue sortie = +20, sinon rien (la première ne compte pas)', () => {
  expect(runXp(12, [8, 10]).total).toBe(20)
  expect(runXp(10, [8, 10]).total).toBe(0)
  expect(runXp(5, []).total).toBe(0)
})
