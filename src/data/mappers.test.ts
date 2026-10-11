import { expect, test } from 'vitest'
import { challenge, ex, g, mkSong, pe, program, set, song, ss } from '../test/factories'
import type { BodyMetric } from '../domain/types'
import {
  bodyMetricToRow,
  challengeToRow,
  childId,
  guitarSessionToRows,
  programToRows,
  songToRow,
  sportSessionToRows,
  toAppData,
  type Rows,
} from './mappers'

const uuid = '1b4e28ba-2fa1-41d2-883f-0016d3cca427'

test('childId : uuid valide, stable, distinct par index', () => {
  expect(childId(uuid, 0)).toBe('1b4e28ba-2fa1-41d2-883f-000000000001')
  expect(childId(uuid, 0)).toBe(childId(uuid, 0))
  expect(childId(uuid, 1)).not.toBe(childId(uuid, 0))
})

test('aller-retour row ↔ domaine pour chaque type', () => {
  const s1 = mkSong({ id: 's1', status: 'mastered', masteredOn: '2026-10-05' })
  const gsess = { ...g('2026-10-11', 45, [ex('legato-4', 104), ex('scales-1', null), song('s1', true)]), id: uuid }
  const prog = program({ id: 'p1', exercises: [pe({ id: 'pe1', programId: 'p1' })] })
  const ssess = { ...ss([set(62.5, 8, 'pe1', 1), set(0, 10, 'pe1', 2)], '2026-10-11', 'p1'), id: uuid.replace('1b', '2c') }
  const metric: BodyMetric = { id: 'm1', day: '2026-10-11', weightKg: 78.4, waistCm: null, chestCm: 101, armCm: null, thighCm: null }
  const ch = challenge({ id: 'c1', target: { kind: 'weight', programExerciseId: 'pe1', reps: 8, weightKg: 62.5, baseline: 60 } })

  const g1 = guitarSessionToRows(gsess)
  const s2 = sportSessionToRows(ssess)
  const p1 = programToRows(prog)
  const rows: Rows = {
    songs: [songToRow(s1)],
    guitar_sessions: [g1.session],
    guitar_session_items: g1.items,
    sport_programs: [p1.program],
    program_exercises: p1.exercises,
    sport_sessions: [s2.session],
    // numeric arrive parfois en chaîne depuis PostgREST
    sport_sets: s2.sets.map((r) => ({ ...r, weight_kg: String(r.weight_kg) as unknown as number })),
    body_metrics: [bodyMetricToRow(metric)],
    challenges: [challengeToRow(ch)],
  }
  expect(challengeToRow(ch)).toMatchObject({ kind: 'weight', target: { programExerciseId: 'pe1', reps: 8, weightKg: 62.5, baseline: 60 } })
  expect(toAppData(rows)).toEqual({
    songs: [s1],
    guitarSessions: [gsess],
    sportSessions: [ssess],
    programs: [prog],
    bodyMetrics: [metric],
    challenges: [ch],
  })
})
