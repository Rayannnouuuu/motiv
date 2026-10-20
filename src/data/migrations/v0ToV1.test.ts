import { describe, expect, test, vi } from 'vitest'
import { g, set, ss } from '../../test/factories'
import { v0Replica } from '../../test/fixtures/v0Replica'
import type { AppData } from '../../domain/types'
import { toAppData } from './project'
import { byId, migrateV0toV1, validateV0, type BackupV0 } from './v0ToV1'

/** Même contenu, tableaux triés par id : l'ordre de lecture du serveur n'a pas de sens. */
const normalize = (d: AppData): AppData => ({
  guitarSessions: [...d.guitarSessions].sort(byId),
  sportSessions: [...d.sportSessions].sort(byId),
  songs: [...d.songs].sort(byId),
  programs: [...d.programs].sort(byId),
  bodyMetrics: [...d.bodyMetrics].sort(byId),
  challenges: [...d.challenges].sort(byId),
})

const backup = (data: Partial<AppData>): BackupV0 => ({
  app: 'motiv',
  schemaVersion: 0,
  exportedAt: '2026-10-19T19:00:00.000Z',
  data: { guitarSessions: [], songs: [], sportSessions: [], programs: [], bodyMetrics: [], challenges: [], ...data },
})

describe('migration format 0 → 1', () => {
  test('aller-retour exact sur la réplique : rien de perdu, rien de modifié', () => {
    const src = v0Replica()
    const { data } = migrateV0toV1(src)
    expect(toAppData(data)).toEqual(normalize(src.data))
  })

  test('comptes de la réplique', () => {
    const { data, report } = migrateV0toV1(v0Replica())
    expect(data.sessions.filter((s) => s.discipline === 'guitar')).toHaveLength(6)
    const sport = data.sessions.filter((s) => s.discipline === 'sport')
    expect(sport).toHaveLength(1)
    expect(sport[0].blocks[0].entries.flatMap((e) => e.sets)).toHaveLength(19)
    expect(data.templates).toHaveLength(6)
    expect(data.templates.flatMap((t) => t.blocks[0].entries)).toHaveLength(36)
    expect(data.songs).toHaveLength(45)
    expect(report.songs).toEqual({ toLearn: 45, learning: 0, mastered: 0, withArtist: 45 })
    expect(data.measurements).toEqual([{ id: 'm-1', day: '2026-10-13', weightKg: 108.9, waistCm: 183, chestCm: null, armCm: null, thighCm: null }])
    expect(data.profile.levelsAtMigration).toEqual({ guitar: 1, sport: 1, global: 1 })
    expect(data.sessions.reduce((t, s) => t + s.xp, 0)).toBe(175)
  })

  test('les noms de programme retrouvent les mouvements de la bibliothèque ; les homonymes partagent un historique', () => {
    const { data, report } = migrateV0toV1(v0Replica())
    expect(report.movements.every((m) => !m.own)).toBe(true)
    const squats = data.templates.flatMap((t) => t.blocks[0].entries).filter((e) => e.name === 'Squat')
    expect(squats.map((e) => e.exerciseId)).toEqual(['squat', 'squat'])
    expect(report.merges).toEqual([{ exerciseName: 'Développé incliné haltères', names: ['Développé incliné', 'Développé incliné haltères'] }])
    expect(data.sessions.find((s) => s.id === 's-1')!.blocks[0].entries.map((e) => e.exerciseId)).toEqual([
      'developpe-couche',
      'developpe-incline-halteres',
      'developpe-militaire',
      'extension-triceps-poulie',
      'dips',
      'elevations-laterales',
    ])
  })

  test('nom inconnu : un mouvement à moi, le même pour deux programmes', () => {
    const p = (id: string) => ({ id, name: 'Haut', position: 0, archived: false, exercises: [{ id: `${id}-1`, programId: id, name: 'Pull-over machine Nautilus', targetSets: 3, targetReps: 10, position: 0, archived: false }] })
    const { data, report } = migrateV0toV1(backup({ programs: [p('a'), p('b')] }))
    const own = data.exercises.filter((m) => m.source === 'user')
    expect(own).toEqual([expect.objectContaining({ id: 'user-pull-over-machine-nautilu', name: 'Pull-over machine Nautilus', body: null, category: null })])
    expect(report.movements).toEqual([{ name: 'Pull-over machine Nautilus', exerciseId: own[0].id, exerciseName: 'Pull-over machine Nautilus', own: true }])
  })

  test('cas limites : tempo vide, même exo deux fois, séries A B A, 0 kg, morceau maîtrisé, exo de programme disparu', () => {
    const src = backup({
      guitarSessions: [
        g('2026-10-01', 20, [
          { kind: 'exercise', exerciseId: 'scales-1', maxBpm: null },
          { kind: 'exercise', exerciseId: 'scales-1', maxBpm: 70 },
          { kind: 'song', songId: 'x', markedMastered: true },
          { kind: 'exercise', exerciseId: 'legato-1', maxBpm: 60 },
        ]),
      ],
      songs: [{ id: 'x', title: 'Morceau perso', status: 'mastered', masteredOn: '2026-10-01' }],
      sportSessions: [ss([set(0, 10, 'pe-a', 1), set(20, 8, 'pe-b', 1), set(0, 9, 'pe-a', 2)])],
    })
    const { data } = migrateV0toV1(src)
    const guitar = data.sessions.find((s) => s.discipline === 'guitar')!
    expect(guitar.blocks.map((b) => b.type)).toEqual(['technique', 'repertoire', 'technique'])
    expect(guitar.blocks[0].entries).toEqual([{ exerciseId: 'scales-1', sets: [] }, { exerciseId: 'scales-1', sets: [{ bpm: 70 }] }])
    expect(guitar.blocks[1].entries).toEqual([{ songId: 'x', markedMastered: true, sets: [] }])
    const sport = data.sessions.find((s) => s.discipline === 'sport')!
    expect(sport.blocks[0].entries.map((e) => e.sets.length)).toEqual([1, 1, 1])
    expect(sport.blocks[0].entries[0].sets).toEqual([{ reps: 10, loadKg: 0 }])
    expect(data.songs[0]).toMatchObject({ status: 'mastered', artist: '' })
    expect(toAppData(data)).toEqual(normalize(src.data))
  })

  test('déterministe : deux exécutions identiques, entrée mélangée → même sortie, ni date ni hasard', () => {
    const random = vi.spyOn(Math, 'random')
    const now = vi.spyOn(Date, 'now')
    const src = v0Replica()
    const shuffled: BackupV0 = { ...src, data: { ...src.data, programs: [...src.data.programs].reverse(), songs: [...src.data.songs].reverse() } }
    expect(migrateV0toV1(shuffled)).toStrictEqual(migrateV0toV1(src))
    expect(random).not.toHaveBeenCalled()
    expect(now).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  test('base vide', () => {
    const { data } = migrateV0toV1(backup({}))
    expect(data.sessions).toEqual([])
    expect(data.exercises.length).toBeGreaterThanOrEqual(30)
    expect(toAppData(data)).toEqual(normalize(backup({}).data))
  })
})

describe('validateV0', () => {
  test('accepte la réplique et signale le tour de taille invraisemblable sans le corriger', () => {
    const r = validateV0(v0Replica())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.warnings).toEqual(['Mesure du 2026-10-13 : 183 cm en tour de taille, ce serait plutôt ta hauteur ? La valeur est gardée telle quelle.'])
  })

  test.each([
    ['pas MOTIV', { app: 'autre' }, "Ce fichier n'est pas une sauvegarde MOTIV."],
    ['version inconnue', { ...v0Replica(), schemaVersion: 7 }, 'Version de sauvegarde inattendue.'],
    ['tableau manquant', { ...v0Replica(), data: { ...v0Replica().data, songs: undefined } }, 'Sauvegarde incomplète : une partie des données manque.'],
    ['jour illisible', backup({ guitarSessions: [{ ...g('2026-10-01', 20), day: '01/10/2026' }] }), 'Une séance du fichier est illisible.'],
    ['ids en double', backup({ guitarSessions: [{ ...g('2026-10-01', 20), id: 'x' }], sportSessions: [{ ...ss([]), id: 'x' }] }), 'Deux séances ont le même identifiant.'],
  ])('refuse : %s', (_, raw, error) => {
    expect(validateV0(raw)).toEqual({ ok: false, error })
  })
})
