import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { v0Replica } from '../test/fixtures/v0Replica'
import { importV0, testDb } from '../test/testDb'
import { useActions, useAppData, type Actions, type AppDataValue } from './AppDataContext'
import { AppDataProvider } from './AppDataProvider'
import { startEmpty } from './backup'
import type { MotivDb } from './db'

afterEach(() => vi.useRealTimers())

function Probe({ onSeen }: { onSeen: (value: AppDataValue, actions: Actions) => void }) {
  onSeen(useAppData(), useActions())
  return <p>appli</p>
}

/** Rend le fournisseur et expose ce que voit un écran. */
function mount(db: MotivDb) {
  const seen: { value?: AppDataValue; actions?: Actions } = {}
  render(
    <AppDataProvider db={db} welcome={<p>bienvenue</p>}>
      <Probe
        onSeen={(value, actions) => {
          seen.value = value
          seen.actions = actions
        }}
      />
    </AppDataProvider>,
  )
  return seen
}

test('premier lancement : l’accueil d’import, rien d’écrit tout seul', async () => {
  const db = testDb()
  mount(db)
  expect(await screen.findByText('bienvenue')).toBeInTheDocument()
  expect(await db.challenges.count()).toBe(0)
  await startEmpty(db, '2026-10-20T08:00:00.000Z')
  expect(await screen.findByText('appli')).toBeInTheDocument()
})

test('données importées : les écrans les reçoivent dans l’ancienne forme', async () => {
  const db = testDb()
  await importV0(db, v0Replica())
  const seen = mount(db)
  await screen.findByText('appli')
  const { data } = seen.value!
  expect(data.guitarSessions).toHaveLength(6)
  expect(data.sportSessions[0].sets).toHaveLength(19)
  expect(data.programs.filter((p) => !p.archived).map((p) => p.name).sort()).toEqual(['Legs', 'Pull', 'Push'])
})

test('log guitare : séance écrite avec son XP, morceau joué « en cours », morceau coché « maîtrisé »', async () => {
  const db = testDb()
  await importV0(db, v0Replica())
  const seen = mount(db)
  await screen.findByText('appli')
  const xp = await seen.actions!.saveGuitarSession({
    id: 'new-g',
    day: '2026-10-20',
    durationMin: 40,
    items: [
      { kind: 'exercise', exerciseId: 'scales-1', maxBpm: 60 },
      { kind: 'song', songId: 'song-00', markedMastered: false },
      { kind: 'song', songId: 'song-01', markedMastered: true },
    ],
    newSongs: [],
    flowRating: 4,
    desireRating: 5,
  })
  expect(xp.total).toBe(40 + 10 + 100)
  const row = await db.sessions.get('new-g')
  expect(row).toMatchObject({ discipline: 'guitar', xp: 150, flowScore: 4, desireScore: 5 })
  expect(row!.blocks.map((b) => b.type)).toEqual(['technique', 'repertoire'])
  expect(await db.songs.get('song-00')).toMatchObject({ status: 'learning' })
  expect(await db.songs.get('song-01')).toMatchObject({ status: 'mastered', masteredOn: '2026-10-20' })
  await waitFor(() => expect(seen.value!.data.guitarSessions).toHaveLength(7))
})

test('séance sport : chaque série rattachée au mouvement de la bibliothèque', async () => {
  const db = testDb()
  await importV0(db, v0Replica())
  const seen = mount(db)
  await screen.findByText('appli')
  await seen.actions!.saveSportSession({
    id: 'new-s',
    day: '2026-10-20',
    programId: 'prog-b2',
    durationMin: 60,
    sets: [{ programExerciseId: 'prog-b2-pe0', setIndex: 1, reps: 8, weightKg: 100 }],
    flowRating: 4,
    desireRating: 4,
  })
  const row = await db.sessions.get('new-s')
  expect(row!.blocks[0].entries).toEqual([{ exerciseId: 'squat', templateEntryId: 'prog-b2-pe0', sets: [{ reps: 8, loadKg: 100 }] }])
})

test('programme : nom inconnu → mouvement à moi ; exo renommé → il suit son nouveau nom', async () => {
  const db = testDb()
  await importV0(db, v0Replica())
  const seen = mount(db)
  await screen.findByText('appli')
  const push = seen.value!.data.programs.find((p) => p.id === 'prog-b0')!
  await seen.actions!.saveProgram({
    ...push,
    exercises: [
      { ...push.exercises[0], name: 'Pec deck' },
      { ...push.exercises[1], name: 'Développé incliné' },
    ],
  })
  const t = await db.templates.get('prog-b0')
  expect(t!.blocks[0].entries.map((e) => e.exerciseId)).toEqual(['user-pec-deck', 'developpe-incline-halteres'])
  expect(await db.exercises.get('user-pec-deck')).toMatchObject({ name: 'Pec deck', source: 'user', body: null })
})

test('supprimer un log', async () => {
  const db = testDb()
  await importV0(db, v0Replica())
  const seen = mount(db)
  await screen.findByText('appli')
  await seen.actions!.deleteLog('guitar', 'g-1')
  expect(await db.sessions.get('g-1')).toBeUndefined()
})

test('défis : créés une fois les données prêtes, pas avant', async () => {
  const db = testDb()
  mount(db)
  await screen.findByText('bienvenue')
  expect(await db.challenges.count()).toBe(0)
  await startEmpty(db, '2026-10-20T08:00:00.000Z')
  await waitFor(async () => expect((await db.challenges.toArray()).map((c) => c.domain).sort()).toEqual(['guitar', 'sport']))
})

test('lecture impossible : message, rien d’effacé, pas d’écran d’accueil', async () => {
  const db = testDb()
  vi.spyOn(db, 'transaction').mockRejectedValue(new Error('base fermée'))
  mount(db)
  expect(await screen.findByText(/n'ont pas pu être lues \(base fermée\)/)).toBeInTheDocument()
  expect(screen.queryByText('bienvenue')).not.toBeInTheDocument()
})
