import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { pe, program, set, ss } from '../../test/factories'
import { renderWithData, type RenderWithDataOptions } from '../../test/renderWithData'
import { loadLive, saveLive, type LiveState } from './liveSession'
import { LogSportPage } from './LogSportPage'

function Probe() {
  const loc = useLocation()
  return <p>at {loc.pathname} {JSON.stringify(loc.state)}</p>
}

const renderSport = (opts: RenderWithDataOptions = {}) =>
  renderWithData(
    <Routes>
      <Route path="/log/sport" element={<LogSportPage />} />
      <Route path="*" element={<Probe />} />
    </Routes>,
    { route: '/log/sport', ...opts },
  )

const bench = pe({ id: 'bench', programId: 'haut', name: 'Développé couché', position: 0 })
const row = pe({ id: 'row', programId: 'haut', name: 'Rowing', position: 1, targetSets: 3, targetReps: 10 })
const haut = program({ id: 'haut', name: 'Haut', position: 0, exercises: [bench, row] })
const bas = program({ id: 'bas', name: 'Bas', position: 1, exercises: [pe({ id: 'squat', programId: 'bas', name: 'Squat' })] })
const history = [ss([set(62.5, 8, 'bench', 1), set(62.5, 8, 'bench', 2), set(62.5, 8, 'bench', 3), set(62.5, 8, 'bench', 4)], '2026-10-08', 'bas')]

const click = (name: string | RegExp) => userEvent.click(screen.getByRole('button', { name }))

beforeEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

describe('LogSportPage', () => {
  test('séance pré-sélectionnée = prochaine du programme, modifiable', async () => {
    renderSport({ data: { programs: [haut, bas], sportSessions: history } })
    expect(screen.getByRole('button', { name: 'Haut' })).toHaveAttribute('aria-pressed', 'true')
    await click('Bas')
    await click('Commencer')
    expect(screen.getByRole('heading', { name: 'Squat' })).toBeInTheDocument()
  })

  test('pré-remplissage, séries et reprise après remontage', async () => {
    const { unmount } = renderSport({ data: { programs: [haut], sportSessions: history } })
    await click('Commencer')
    const recent = screen.getByRole('region', { name: 'Tes dernières fois' })
    expect(within(recent).getByText('8 oct.')).toBeInTheDocument()
    expect(within(recent).getAllByText('62,5 kg × 8')).toHaveLength(4)
    expect(screen.getByLabelText('Charge (kg)')).toHaveValue('62,5')
    await click('Charge +')
    await click('✓ Série 1 faite')
    unmount()

    renderSport({ data: { programs: [haut], sportSessions: history } })
    expect(screen.getByRole('heading', { name: 'Développé couché' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '✓ Série 2 faite' })).toBeInTheDocument()
    expect(screen.getByText('8×65 kg')).toBeInTheDocument()
    expect(loadLive()?.sets).toEqual([set(65, 8, 'bench', 1)])
  })

  test('PDC affiché quand la charge vaut 0', async () => {
    renderSport({ data: { programs: [haut] } })
    await click('Commencer')
    expect(screen.getByText(/Première fois sur cet exo/)).toBeInTheDocument()
    expect(screen.getByText('PDC')).toBeInTheDocument()
    await click('Charge −')
    expect(screen.getByLabelText('Charge (kg)')).toHaveValue('0')
  })

  test('exo archivé depuis le début de la séance : sauté sans plantage', async () => {
    const { unmount } = renderSport({ data: { programs: [haut] } })
    await click('Commencer')
    unmount()
    const archived = { ...haut, exercises: [{ ...bench, archived: true }, row] }
    renderSport({ data: { programs: [archived] } })
    expect(screen.getByRole('heading', { name: 'Rowing' })).toBeInTheDocument()
  })

  test('séance de plus de 12 h : Terminer ou Abandonner', async () => {
    const old: LiveState = {
      id: 'live',
      programId: 'haut',
      startedAt: new Date(Date.now() - 13 * 3600_000).toISOString(),
      exerciseIndex: 0,
      exerciseId: 'bench',
      weightKg: 60,
      reps: 8,
      sets: [set(60, 8, 'bench')],
    }
    saveLive(old)
    const { unmount } = renderSport({ data: { programs: [haut] } })
    await click('Abandonner')
    expect(loadLive()).toBeNull()
    expect(screen.getByText("at / null")).toBeInTheDocument()
    unmount()

    saveLive(old)
    renderSport({ data: { programs: [haut] } })
    await click('Terminer')
    expect(screen.getByLabelText('Durée en minutes')).toHaveValue(null)
  })

  test('fin : durée pré-remplie, notes, Terminer enregistre et vide l’état', async () => {
    const result = { total: 75, lines: [{ label: 'Séance terminée', xp: 60 }] }
    const { actions } = renderSport({ data: { programs: [haut] }, actions: { saveSportSession: vi.fn(async () => result) } })
    await click('Commencer')
    await click('✓ Série 1 faite')
    await click('Exo suivant →')
    expect(screen.getByRole('heading', { name: 'Rowing' })).toBeInTheDocument()
    await click('Fin de séance →')
    expect(screen.getByLabelText('Durée en minutes')).toHaveValue(1)
    await userEvent.click(screen.getAllByRole('radio', { name: '4' })[0])
    await userEvent.click(screen.getAllByRole('radio', { name: '5' })[1])
    await click('Terminer')
    expect(actions.saveSportSession).toHaveBeenCalledWith({
      id: expect.any(String),
      day: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      programId: 'haut',
      durationMin: 1,
      sets: [set(0, 8, 'bench', 1)],
      flowRating: 4,
      desireRating: 5,
    })
    expect(await screen.findByText(`at /xp ${JSON.stringify({ result, domain: 'sport', logId: vi.mocked(actions.saveSportSession).mock.calls[0][0].id })}`)).toBeInTheDocument()
    expect(loadLive()).toBeNull()
  })

  test('« Précédent » ramène à l’exo d’avant, et depuis la fin de séance', async () => {
    renderSport({ data: { programs: [haut] } })
    await click('Commencer')
    expect(screen.queryByRole('button', { name: '← Précédent' })).not.toBeInTheDocument()
    await click('Exo suivant →')
    await click('← Précédent')
    expect(screen.getByRole('heading', { name: 'Développé couché' })).toBeInTheDocument()
    await click('Exo suivant →')
    await click('Fin de séance →')
    await click('← Revenir au dernier exo')
    expect(screen.getByRole('heading', { name: 'Rowing' })).toBeInTheDocument()
  })

  test('fin sans série : Terminer bloqué, abandon en deux temps', async () => {
    const { actions } = renderSport({ data: { programs: [haut] } })
    await click('Commencer')
    await click('Exo suivant →')
    await click('Fin de séance →')
    expect(screen.getByRole('button', { name: 'Terminer' })).toBeDisabled()
    await click('Abandonner la séance')
    expect(loadLive()).not.toBeNull()
    await click("Oui, abandonner (rien n'est enregistré)")
    expect(loadLive()).toBeNull()
    expect(actions.saveSportSession).not.toHaveBeenCalled()
    expect(screen.getByText('at / null')).toBeInTheDocument()
  })

  test('corriger ou supprimer une série déjà faite', async () => {
    renderSport({ data: { programs: [haut] } })
    await click('Commencer')
    await click('✓ Série 1 faite')
    await click('Reps +')
    await click('✓ Série 2 faite')
    expect(loadLive()!.sets).toEqual([set(0, 8, 'bench', 1), set(0, 9, 'bench', 2)])

    await click('Modifier la série 1')
    expect(screen.getByLabelText('Reps')).toHaveTextContent('8')
    await click('Charge +')
    await click('✓ Enregistrer la série 1')
    expect(loadLive()!.sets).toEqual([set(2.5, 8, 'bench', 1), set(0, 9, 'bench', 2)])
    expect(screen.getByLabelText('Reps')).toHaveTextContent('9') // valeurs d'avant la correction

    await click('Modifier la série 1')
    await click('Supprimer la série')
    expect(loadLive()!.sets).toEqual([set(0, 9, 'bench', 1)])
    expect(screen.getByRole('button', { name: '✓ Série 2 faite' })).toBeInTheDocument()
  })

  test('abandonner pendant la séance, avec confirmation', async () => {
    const { actions } = renderSport({ data: { programs: [haut] } })
    await click('Commencer')
    await click('✓ Série 1 faite')
    await click('Abandonner la séance')
    await click('Continuer')
    expect(loadLive()).not.toBeNull()
    await click('Abandonner la séance')
    await click('Oui, abandonner')
    expect(loadLive()).toBeNull()
    expect(actions.saveSportSession).not.toHaveBeenCalled()
    expect(screen.getByText('at / null')).toBeInTheDocument()
  })

  test('sans programme : lien vers les réglages', () => {
    renderSport()
    expect(screen.getByRole('link', { name: 'Créer ton programme' })).toHaveAttribute('href', '/reglages')
  })
})
