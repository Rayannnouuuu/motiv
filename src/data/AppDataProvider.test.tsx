import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { v0Replica } from '../test/fixtures/v0Replica'
import { profile } from '../domain/marathon/fixtures'
import { RUNNER_TEMPLATE_ID, runnerMoves } from '../domain/marathon/strength'
import { nextProgram } from '../domain/progression'
import { importV0, testDb } from '../test/testDb'
import { useActions, useAppData, type Actions, type AppDataValue, type GuitarDraft } from './AppDataContext'
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
  expect(
    data.programs
      .filter((p) => !p.archived)
      .map((p) => p.name)
      .sort(),
  ).toEqual(['Legs', 'Pull', 'Push'])
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

test('correction d’un log : la séance légère, la note et le tempo propre restent', async () => {
  const db = testDb()
  await importV0(db, v0Replica())
  const seen = mount(db)
  await screen.findByText('appli')
  const draft: GuitarDraft = {
    id: 'new-g',
    day: '2026-10-20',
    durationMin: 30,
    items: [{ kind: 'exercise', exerciseId: 'scales-1', maxBpm: 72, clean: true }],
    newSongs: [],
    flowRating: 3,
    desireRating: 3,
    note: 'Propre à 72.',
  }
  await seen.actions!.saveGuitarSession(draft)
  await db.sessions.update('new-g', { isLight: true })
  await waitFor(() => expect(seen.value!.v1.sessions.find((s) => s.id === 'new-g')?.isLight).toBe(true))
  await seen.actions!.saveGuitarSession({ ...draft, durationMin: 35 })
  expect(await db.sessions.get('new-g')).toMatchObject({
    durationMin: 35,
    isLight: true,
    note: 'Propre à 72.',
    blocks: [{ type: 'technique', entries: [{ exerciseId: 'scales-1', sets: [{ bpm: 72, clean: true }] }] }],
  })
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

test('records sport comptés par mouvement : un nouveau programme garde l’historique du squat', async () => {
  const db = testDb()
  await importV0(db, v0Replica())
  const seen = mount(db)
  await screen.findByText('appli')
  const session = { durationMin: 60, flowRating: 4, desireRating: 4 } as const
  await seen.actions!.saveSportSession({
    ...session,
    id: 's1',
    day: '2026-10-20',
    programId: 'prog-b2',
    sets: [{ programExerciseId: 'prog-b2-pe0', setIndex: 1, reps: 8, weightKg: 200 }],
  })
  await seen.actions!.saveProgram({
    id: 'jambes',
    name: 'Jambes',
    position: 9,
    archived: false,
    exercises: [{ id: 'x-squat', programId: 'jambes', name: 'Squat', targetSets: 3, targetReps: 8, position: 0, archived: false }],
  })
  await waitFor(() => expect(seen.value!.v1.templates.some((t) => t.id === 'jambes')).toBe(true))
  const second = await seen.actions!.saveSportSession({
    ...session,
    id: 's2',
    day: '2026-10-21',
    programId: 'jambes',
    sets: [{ programExerciseId: 'x-squat', setIndex: 1, reps: 8, weightKg: 205 }],
  })
  // Sans suivi par mouvement, ce serait une « première fois » : pas de record.
  expect(second.lines.map((l) => l.label)).toEqual(['Séance terminée', 'Record · Squat'])
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

test('répertoire : statut à entretenir gardé par une sauvegarde à l’ancienne forme ; « en cours » efface la date', async () => {
  const db = testDb()
  await importV0(db, v0Replica())
  const seen = mount(db)
  await screen.findByText('appli')
  const song = seen.value!.v1.songs[0]
  await seen.actions!.setSongStatus(song.id, 'mastered')
  const { masteredOn } = (await db.songs.get(song.id))!
  expect(masteredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  await seen.actions!.setSongStatus(song.id, 'maintain')
  expect(await db.songs.get(song.id)).toMatchObject({ status: 'maintain', masteredOn })
  await waitFor(() => expect(seen.value!.v1.songs.find((s) => s.id === song.id)?.status).toBe('maintain'))
  const old = seen.value!.data.songs.find((s) => s.id === song.id)!
  await seen.actions!.saveSong({ ...old, title: `${old.title} (live)` })
  expect(await db.songs.get(song.id)).toMatchObject({ status: 'maintain', title: `${old.title} (live)` })
  await seen.actions!.setSongStatus(song.id, 'learning')
  expect(await db.songs.get(song.id)).toMatchObject({ status: 'learning', masteredOn: null })
})

describe('marathon (lot 3)', () => {
  const marathon = profile({ startedOn: '2026-10-19' })

  test('profil : rangé dans `profile`, modèle « Renfo coureur » créé avec ses mouvements, hors rotation PPL', async () => {
    const db = testDb()
    await importV0(db, v0Replica())
    const seen = mount(db)
    await screen.findByText('appli')
    const before = nextProgram(seen.value!.data.programs, seen.value!.data.sportSessions)
    await seen.actions!.saveMarathon(marathon)
    expect((await db.profile.get('profile'))!.marathon).toEqual(marathon)
    const t = (await db.templates.get(RUNNER_TEMPLATE_ID))!
    expect(t.name).toBe('Renfo coureur (salle)')
    expect(t.blocks[0].entries.map((e) => e.exerciseId)).toEqual(runnerMoves(true).map((m) => m.movementId))
    expect(await db.exercises.get('montees-sur-banc')).toMatchObject({ name: 'Montées sur banc', source: 'legacy' })
    await waitFor(() => expect(seen.value!.data.programs.some((p) => p.id === RUNNER_TEMPLATE_ID)).toBe(true))
    expect(nextProgram(seen.value!.data.programs, seen.value!.data.sportSessions)?.id).toBe(before?.id)

    // Tes changements restent ; passer à la maison refait le modèle, les lignes d'avant sont archivées.
    await db.templates.update(RUNNER_TEMPLATE_ID, { name: 'Mon renfo' })
    await waitFor(() => expect(seen.value!.v1.templates.find((x) => x.id === RUNNER_TEMPLATE_ID)?.name).toBe('Mon renfo'))
    await seen.actions!.saveMarathon({ ...marathon, race: { ...marathon.race, name: 'Paris' } })
    expect((await db.templates.get(RUNNER_TEMPLATE_ID))!.name).toBe('Mon renfo')
    await seen.actions!.saveMarathon({ ...marathon, constraints: { ...marathon.constraints, gym: false } })
    const home = (await db.templates.get(RUNNER_TEMPLATE_ID))!
    expect(home.name).toBe('Renfo coureur (maison)')
    expect(home.blocks[0].entries.find((e) => e.exerciseId === 'mollets-debout')).toMatchObject({ archived: true })
  })

  test('sortie : distance, durée, douleur ; une correction les garde ; la rotation PPL ne bouge pas', async () => {
    const db = testDb()
    await importV0(db, v0Replica())
    const seen = mount(db)
    await screen.findByText('appli')
    await seen.actions!.saveMarathon(marathon)
    await waitFor(() => expect(seen.value!.v1.profile.marathon).toBeDefined())
    const next = nextProgram(seen.value!.data.programs, seen.value!.data.sportSessions)
    const draft = { id: 'run-1', day: '2026-10-20', durationMin: 47, km: 10, sec: 46 * 60, pain: 2, flowRating: 4, desireRating: 4 } as const
    const xp = await seen.actions!.saveRun(draft)
    // 10 km en 46 min bat le 10 km en 48 min du profil : nouvelle référence.
    expect(xp.chrono).toEqual({ distance: '10k', sec: 46 * 60, day: '2026-10-20' })
    expect((await db.profile.get('profile'))!.marathon!.level.chrono).toEqual(xp.chrono)
    expect(await db.sessions.get('run-1')).toMatchObject({
      discipline: 'sport',
      pain: 2,
      blocks: [{ type: 'main', entries: [{ exerciseId: 'course', sets: [{ distanceKm: 10, durationSec: 2760 }] }] }],
    })
    await waitFor(() => expect(seen.value!.data.sportSessions.find((s) => s.id === 'run-1')).toMatchObject({ sets: [], programId: '' }))
    expect(nextProgram(seen.value!.data.programs, seen.value!.data.sportSessions)?.id).toBe(next?.id)

    // Correction depuis l'écran de correction (ancienne forme) : la distance et la douleur restent.
    const old = seen.value!.data.sportSessions.find((s) => s.id === 'run-1')!
    await seen.actions!.saveSportSession({ ...old, durationMin: 50 })
    expect(await db.sessions.get('run-1')).toMatchObject({
      durationMin: 50,
      pain: 2,
      blocks: [{ entries: [{ exerciseId: 'course', sets: [{ distanceKm: 10 }] }] }],
    })
  })

  test('semaine malade : ajoutée puis retirée', async () => {
    const db = testDb()
    await importV0(db, v0Replica())
    const seen = mount(db)
    await screen.findByText('appli')
    await seen.actions!.saveMarathon(marathon)
    await waitFor(() => expect(seen.value!.v1.profile.marathon).toBeDefined())
    await seen.actions!.setSickWeek('2026-10-19', true)
    expect((await db.profile.get('profile'))!.marathon!.sickWeeks).toEqual(['2026-10-19'])
    await waitFor(() => expect(seen.value!.v1.profile.marathon!.sickWeeks).toEqual(['2026-10-19']))
    await seen.actions!.setSickWeek('2026-10-19', false)
    expect((await db.profile.get('profile'))!.marathon!.sickWeeks).toEqual([])
  })
})
