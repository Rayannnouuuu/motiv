import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'
import { ex, g, mkSong, pe, program, set, song, ss } from '../../test/factories'
import { renderWithData, type RenderWithDataOptions } from '../../test/renderWithData'
import { EditLogPage } from './EditLogPage'

const today = '2026-10-15'

function Probe() {
  const loc = useLocation()
  return <p>at {loc.pathname} {JSON.stringify(loc.state)}</p>
}

const renderEdit = (opts: RenderWithDataOptions = {}) =>
  renderWithData(
    <Routes>
      <Route path="/log/corriger" element={<EditLogPage />} />
      <Route path="/log/corriger/:id" element={<EditLogPage />} />
      <Route path="*" element={<Probe />} />
    </Routes>,
    { today, route: '/log/corriger', ...opts },
  )

const click = (name: string) => userEvent.click(screen.getByRole('button', { name }))

describe('EditLogPage', () => {
  test('aucun log', () => {
    renderEdit()
    expect(screen.getByText('Aucun log à corriger.')).toBeInTheDocument()
  })

  test('guitare : corrige le dernier log (durée, tempo, exo retiré), même id', async () => {
    const older = { ...g('2026-10-14', 60), createdAt: '2026-10-14T20:00:00Z' }
    const last = { ...g(today, 45, [ex('legato-4', 140), ex('scales-1', 70)]), createdAt: '2026-10-15T20:00:00Z', flowRating: 4 as const }
    const result = { total: 30, lines: [] }
    const { actions } = renderEdit({
      data: { guitarSessions: [older, last] },
      actions: { saveGuitarSession: vi.fn(async () => result) },
    })
    const duration = screen.getByLabelText('Durée (min)')
    expect(duration).toHaveValue(45)
    await userEvent.clear(duration)
    await userEvent.type(duration, '30')
    const tempo = screen.getByLabelText('Tempo max · Legato 4')
    await userEvent.clear(tempo)
    await userEvent.type(tempo, '104')
    await click('Retirer Gamme majeure 1')
    await click('Enregistrer la correction')
    expect(actions.saveGuitarSession).toHaveBeenCalledWith({
      id: last.id,
      day: today,
      durationMin: 30,
      items: [{ kind: 'exercise', exerciseId: 'legato-4', maxBpm: 104 }],
      newSongs: [],
      flowRating: 4,
      desireRating: 3,
    })
    expect(await screen.findByText(`at /xp ${JSON.stringify({ result, domain: 'guitar', logId: last.id })}`)).toBeInTheDocument()
  })

  test('guitare : décocher un morceau passé en maîtrisé par ce log le remet en cours', async () => {
    const paranoid = mkSong({ id: 's1', title: 'Paranoid', status: 'mastered', masteredOn: today })
    const last = g(today, 30, [song('s1', true)])
    const { actions } = renderEdit({ data: { guitarSessions: [last], songs: [paranoid] } })
    await userEvent.click(screen.getByLabelText('Maîtrisé · Paranoid'))
    await click('Enregistrer la correction')
    expect(actions.saveSong).toHaveBeenCalledWith({ ...paranoid, status: 'learning', masteredOn: null })
    expect(vi.mocked(actions.saveGuitarSession).mock.calls[0][0].items).toEqual([song('s1', false)])
  })

  test('sport : corrige une charge, retire une série (renumérotée)', async () => {
    const bench = pe({ id: 'bench', name: 'Développé couché' })
    const last = ss([set(60, 8, 'bench', 1), set(600, 8, 'bench', 2), set(60, 7, 'bench', 3)], today)
    const { actions } = renderEdit({ data: { programs: [program({ id: 'p1', exercises: [bench] })], sportSessions: [last] } })
    await click('Retirer Développé couché série 2')
    const w = screen.getByLabelText('Charge · Développé couché · série 2')
    await userEvent.clear(w)
    await userEvent.type(w, '62.5')
    await click('Enregistrer la correction')
    expect(vi.mocked(actions.saveSportSession).mock.calls[0][0]).toMatchObject({
      id: last.id,
      sets: [set(60, 8, 'bench', 1), set(62.5, 7, 'bench', 2)],
    })
  })

  test('supprimer : confirmation puis suppression', async () => {
    const last = g(today, 30)
    const { actions } = renderEdit({ data: { guitarSessions: [last] } })
    await click('Supprimer ce log')
    expect(actions.deleteLog).not.toHaveBeenCalled()
    await click('Supprimer')
    expect(actions.deleteLog).toHaveBeenCalledWith('guitar', last.id)
    expect(await screen.findByText('at / null')).toBeInTheDocument()
  })

  test('supprimer un log qui avait maîtrisé un morceau : le morceau redevient en cours', async () => {
    const s1 = mkSong({ id: 's1', status: 'mastered', masteredOn: today })
    const last = g(today, 30, [song('s1', true)])
    const { actions } = renderEdit({ data: { guitarSessions: [last], songs: [s1] } })
    await click('Supprimer ce log')
    await click('Supprimer')
    expect(actions.saveSong).toHaveBeenCalledWith({ ...s1, status: 'learning', masteredOn: null })
    expect(actions.deleteLog).toHaveBeenCalledWith('guitar', last.id)
  })

  test('ouverture pendant le chargement : attend les données', () => {
    renderEdit({ loading: true, data: { guitarSessions: [g(today, 30)] } })
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  test('corriger un log précis (pas le dernier) via son id', async () => {
    const old = { ...g('2026-10-10', 40, [ex('legato-4', 300)]), createdAt: '2026-10-10T20:00:00Z' }
    const last = { ...g(today, 30), createdAt: '2026-10-15T20:00:00Z' }
    const { actions } = renderEdit({ route: `/log/corriger/${old.id}`, data: { guitarSessions: [old, last] } })
    expect(screen.getByRole('heading', { name: 'Corriger ce log' })).toBeInTheDocument()
    const tempo = screen.getByLabelText('Tempo max · Legato 4')
    await userEvent.clear(tempo)
    await userEvent.type(tempo, '100')
    await click('Enregistrer la correction')
    expect(vi.mocked(actions.saveGuitarSession).mock.calls[0][0]).toMatchObject({ id: old.id, day: '2026-10-10', items: [ex('legato-4', 100)] })
  })
})
