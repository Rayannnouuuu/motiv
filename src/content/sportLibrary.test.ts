import { expect, test } from 'vitest'
import { findMovement, movementKey, SPORT_MOVEMENTS } from './sportLibrary'
import { SPORT_PRESETS } from './sportPresets'

const presetExercises = SPORT_PRESETS.flatMap((p) => p.sessions.flatMap((s) => s.exercises))

test('une trentaine de mouvements de base, ids en slug et noms uniques', () => {
  expect(SPORT_MOVEMENTS.length).toBeGreaterThanOrEqual(30)
  expect(SPORT_MOVEMENTS.filter((m) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.id)).map((m) => m.id)).toEqual([])
  expect(new Set(SPORT_MOVEMENTS.map((m) => m.id)).size).toBe(SPORT_MOVEMENTS.length)
  expect(new Set(SPORT_MOVEMENTS.map((m) => m.name)).size).toBe(SPORT_MOVEMENTS.length)
  expect(SPORT_MOVEMENTS.filter((m) => m.discipline !== 'sport' || m.source !== 'legacy').map((m) => m.id)).toEqual([])
})

test('aucun nom ni alias partagé ou redondant : chacun renvoie à son propre mouvement', () => {
  const names = SPORT_MOVEMENTS.flatMap((m) => [m.name, ...m.aliases])
  const keys = names.map(movementKey)
  expect(names.filter((_, i) => keys.indexOf(keys[i]) !== i)).toEqual([])
  const wrong = SPORT_MOVEMENTS.flatMap((m) => [m.name, ...m.aliases].filter((n) => findMovement(n) !== m))
  expect(wrong).toEqual([])
})

test('métriques cohérentes : une fourchette valide si et seulement si on compte des répétitions', () => {
  const counted = SPORT_MOVEMENTS.filter((m) => m.metric === 'load_reps' || m.metric === 'reps')
  const bad = counted.filter(({ repRange: r }) => !r || !Number.isInteger(r[0]) || !Number.isInteger(r[1]) || r[0] < 1 || r[0] > r[1])
  expect(bad.map((m) => m.id)).toEqual([])
  expect(SPORT_MOVEMENTS.filter((m) => !counted.includes(m) && m.repRange !== null).map((m) => m.id)).toEqual([])
})

test('métriques cohérentes avec le matériel et le groupe', () => {
  // Répétitions seules = poids du corps ; une charge = du matériel.
  expect(SPORT_MOVEMENTS.filter((m) => m.metric === 'reps' && m.equipment !== 'bodyweight').map((m) => m.id)).toEqual([])
  expect(SPORT_MOVEMENTS.filter((m) => m.metric === 'load_reps' && m.equipment === 'bodyweight').map((m) => m.id)).toEqual([])
  // Le cardio se mesure en durée ou en distance.
  const cardio = SPORT_MOVEMENTS.filter((m) => m.category === 'cardio')
  expect(cardio.map((m) => m.id)).toEqual(['rameur', 'course', 'velo'])
  expect(cardio.filter((m) => m.metric !== 'duration' && m.metric !== 'distance').map((m) => m.id)).toEqual([])
})

test('haut et bas du corps : les jambes en bas, les bras, le buste et les abdos en haut', () => {
  const lower = ['quads', 'hamstrings', 'glutes', 'calves', 'cardio']
  const wrong = SPORT_MOVEMENTS.filter((m) => m.id !== 'souleve-de-terre' && lower.includes(m.category) !== (m.body === 'lower'))
  expect(wrong.map((m) => m.id)).toEqual([])
  expect(findMovement('Soulevé de terre')?.body).toBe('lower')
})

test('chaque exo des programmes tout faits est reconnu, avec ses répétitions dans la fourchette', () => {
  expect(presetExercises.filter((e) => !findMovement(e.name)).map((e) => e.name)).toEqual([])
  const outside = presetExercises.filter((e) => {
    const r = findMovement(e.name)?.repRange
    return !r || e.reps < r[0] || e.reps > r[1]
  })
  expect(outside.map((e) => `${e.name} ${e.reps}`)).toEqual([])
})

test('les grands classiques sont là', () => {
  const ids = [
    'squat',
    'souleve-de-terre',
    'developpe-couche',
    'developpe-militaire',
    'tractions',
    'rowing-barre',
    'dips',
    'fentes',
    'hip-thrust',
    'presse-a-cuisses',
    'leg-curl',
    'leg-extension',
    'mollets-debout',
    'elevations-laterales',
    'face-pull',
    'curl-biceps',
    'extension-triceps-poulie',
    'gainage',
    'crunchs',
    'rameur',
    'course',
    'velo',
  ]
  expect(ids.filter((id) => !SPORT_MOVEMENTS.some((m) => m.id === id))).toEqual([])
})

test('movementKey : sans accents, casse, ponctuation, espaces en trop ni pluriel simple', () => {
  expect(movementKey('  Élévations   latérales (haltères) ')).toBe('elevation laterale haltere')
  expect(movementKey('Développé-couché')).toBe(movementKey('developpe couche'))
  expect(movementKey('Pull-ups')).toBe(movementKey('pull up'))
})

test('findMovement reconnaît des noms tapés librement', () => {
  const cases: [string, string | undefined][] = [
    ['developpe couche', 'developpe-couche'],
    ['Développé-couché', 'developpe-couche'],
    ['Bench press', 'developpe-couche'],
    ['  SOULEVÉ   DE TERRE ', 'souleve-de-terre'],
    ['RDL', 'souleve-de-terre-roumain'],
    // La traction standard se fait en pronation : même mouvement.
    ['Tractions pronation', 'tractions'],
    ['Pull-up', 'tractions'],
    // Pluriel ou singulier, peu importe.
    ['Élévation latérale', 'elevations-laterales'],
    ['pompe', 'pompes'],
    ['Leg curls', 'leg-curl'],
    ['Curl bicep', 'curl-biceps'],
    ['Hip thrust (barre)', 'hip-thrust'],
    ['Presse', 'presse-a-cuisses'],
    ['Tapis de course', 'course'],
    // Une variante garde son propre historique : elle deviendra un mouvement à toi.
    ['Tractions supination', undefined],
    ['Développé incliné barre', undefined],
    // Trop vague pour choisir entre crunchs et gainage.
    ['Abdos', undefined],
    ['', undefined],
  ]
  expect(cases.map(([name]) => findMovement(name)?.id)).toEqual(cases.map(([, id]) => id))
})
