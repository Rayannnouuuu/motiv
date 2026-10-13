import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ActionsContext, AppDataContext } from '../../data/AppDataContext'
import { EMPTY_DATA, type AppData } from '../../domain/types'
import { challenge, pe, program, set, ss } from '../../test/factories'
import { fakeActions, renderWithData, type RenderWithDataOptions } from '../../test/renderWithData'
import { beep, primeBeep } from './beep'
import { loadLive, saveLive, type LiveState } from './liveSession'
import { LogSportPage } from './LogSportPage'

vi.mock('./beep')

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

/** Contexte de données maison : les données peuvent arriver après le montage (rerender). */
function Harness({ data, loading }: { data: Partial<AppData>; loading: boolean }) {
  const value = { data: { ...EMPTY_DATA, ...data }, pendingCount: 0, rejected: [], today: '2026-10-15', loading, error: null, fresh: !loading, offline: false }
  return (
    <MemoryRouter initialEntries={['/log/sport']}>
      <AppDataContext.Provider value={value}>
        <ActionsContext.Provider value={harnessActions}>
          <LogSportPage />
        </ActionsContext.Provider>
      </AppDataContext.Provider>
    </MemoryRouter>
  )
}
const harnessActions = fakeActions()

const bench = pe({ id: 'bench', programId: 'haut', name: 'Développé couché', position: 0 })
const row = pe({ id: 'row', programId: 'haut', name: 'Rowing', position: 1, targetSets: 3, targetReps: 10 })
const haut = program({ id: 'haut', name: 'Haut', position: 0, exercises: [bench, row] })
const bas = program({ id: 'bas', name: 'Bas', position: 1, exercises: [pe({ id: 'squat', programId: 'bas', name: 'Squat' })] })
// 4×8 à 62,5 validé il y a une semaine : la charge du jour est 65.
const history = [ss([set(62.5, 8, 'bench', 1), set(62.5, 8, 'bench', 2), set(62.5, 8, 'bench', 3), set(62.5, 8, 'bench', 4)], '2026-10-08', 'bas')]

let user: ReturnType<typeof userEvent.setup>
const click = (name: string | RegExp) => user.click(screen.getByRole('button', { name }))
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))
const seriesCount = () => within(screen.getByRole('list', { name: 'Séries' })).getAllByRole('listitem').length

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-15T16:00:00Z'))
  // Testing Library ne reconnaît que les faux minuteurs de Jest : sans ça, il attend un setTimeout(0) qui ne vient jamais.
  vi.stubGlobal('jest', { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) })
  user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('LogSportPage', () => {
  test('séance pré-sélectionnée = prochaine du programme, modifiable', async () => {
    renderSport({ data: { programs: [haut, bas], sportSessions: history } })
    expect(screen.getByRole('button', { name: 'Haut' })).toHaveAttribute('aria-pressed', 'true')
    await click('Bas')
    await click('Commencer')
    expect(screen.getByRole('heading', { name: 'Squat' })).toBeInTheDocument()
  })

  test('charge du jour pré-remplie, séries et reprise après remontage', async () => {
    const { unmount } = renderSport({ data: { programs: [haut], sportSessions: history } })
    await click('Commencer')
    const recent = screen.getByRole('region', { name: 'Tes dernières fois' })
    expect(within(recent).getByText('8 oct.')).toBeInTheDocument()
    expect(within(recent).getAllByText('62,5 kg × 8')).toHaveLength(4)
    expect(screen.getByText('Série 1/4 · objectif 4×8')).toBeInTheDocument()
    expect(screen.getByLabelText('Charge (kg)')).toHaveValue('65')
    expect(screen.getByText("↑ 65 kg aujourd'hui : tu as validé 4×8 à 62,5 kg")).toHaveClass('text-guitar')
    await click('Charge +')
    await click('✓ Série 1 faite')
    unmount()

    renderSport({ data: { programs: [haut], sportSessions: history } })
    expect(screen.getByRole('heading', { name: 'Développé couché' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '✓ Série 2 faite' })).toBeInTheDocument()
    expect(screen.getByText('8×67,5 kg')).toBeInTheDocument()
    expect(loadLive()?.sets).toEqual([set(67.5, 8, 'bench', 1)])
  })

  test('PDC affiché quand la charge vaut 0', async () => {
    renderSport({ data: { programs: [haut] } })
    await click('Commencer')
    expect(screen.getByText(/Première fois sur cet exo/)).toBeInTheDocument()
    expect(screen.getByText('PDC')).toBeInTheDocument()
    await click('Charge −')
    expect(screen.getByLabelText('Charge (kg)')).toHaveValue('0')
  })

  test('séries visées faites : l’exo suivant devient l’action principale, série en plus possible', async () => {
    renderSport({ data: { programs: [haut] } })
    await click('Commencer')
    expect(seriesCount()).toBe(4)
    await click('✓ Série 1 faite')
    expect(screen.queryByRole('button', { name: 'Changer' })).not.toBeInTheDocument()
    await click('✓ Série 2 faite')
    await click('✓ Série 3 faite')
    expect(screen.getByRole('button', { name: 'Exo suivant →' })).toBeInTheDocument()
    await click('✓ Série 4 faite')

    expect(screen.getByText('4/4 séries ✓')).toBeInTheDocument()
    expect(seriesCount()).toBe(4) // plus de case vide en trop
    expect(screen.queryByRole('button', { name: /Série 5 faite/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exo suivant : Rowing →' })).toBeInTheDocument()

    await click('+ Série en plus')
    expect(seriesCount()).toBe(5)
    expect(loadLive()!.sets).toHaveLength(5)
    expect(loadLive()!.sets[4]).toEqual(set(0, 8, 'bench', 5))

    await click('Exo suivant : Rowing →')
    expect(screen.getByRole('heading', { name: 'Rowing' })).toBeInTheDocument()
    for (const n of [1, 2, 3]) await click(`✓ Série ${n} faite`)
    expect(screen.getByRole('button', { name: 'Fin de séance →' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '‹ Précédent' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Série en plus' })).toBeInTheDocument()
  })

  describe('repos', () => {
    test('2:00 après une série de 8, +30 s, passer', async () => {
      renderSport({ data: { programs: [haut] } })
      await click('Commencer')
      expect(screen.queryByRole('timer')).not.toBeInTheDocument()
      await click('✓ Série 1 faite')
      expect(primeBeep).toHaveBeenCalledTimes(1)
      const timer = screen.getByRole('timer', { name: 'Repos' })
      expect(timer).toHaveTextContent('2:00')
      await click('+30 s')
      expect(timer).toHaveTextContent('2:30')
      await advance(18_000)
      expect(timer).toHaveTextContent('2:12')
      await click('Passer')
      expect(screen.queryByRole('timer')).not.toBeInTheDocument()
      expect(loadLive()!.restStartedAt).toBeNull()
    })

    test('à 0 : « C’est reparti », un seul bip, puis plus rien après une minute', async () => {
      renderSport({ data: { programs: [haut] } })
      await click('Commencer')
      await click('✓ Série 1 faite')
      await advance(119_000)
      expect(screen.getByRole('timer')).toHaveTextContent('0:01')
      expect(beep).not.toHaveBeenCalled()
      await advance(1_000)
      expect(screen.getByRole('timer')).toHaveTextContent("C'est reparti : série 2")
      expect(screen.queryByRole('button', { name: 'Passer' })).not.toBeInTheDocument()
      expect(beep).toHaveBeenCalledTimes(1)
      await advance(30_000)
      expect(beep).toHaveBeenCalledTimes(1)
      await advance(30_000)
      expect(screen.queryByRole('timer')).not.toBeInTheDocument()
      expect(beep).toHaveBeenCalledTimes(1)
    })

    test('calculé depuis l’horodatage : juste après un rechargement, sans bip si la fin est passée', () => {
      const live: LiveState = {
        id: 'live',
        programId: 'haut',
        startedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
        exerciseIndex: 0,
        exerciseId: 'bench',
        weightKg: 60,
        reps: 8,
        sets: [set(60, 8, 'bench', 1)],
        restStartedAt: new Date(Date.now() - 30_000).toISOString(),
        restSec: 120,
      }
      saveLive(live)
      const { unmount } = renderSport({ data: { programs: [haut] } })
      expect(screen.getByRole('timer')).toHaveTextContent('1:30')
      unmount()

      saveLive({ ...live, restStartedAt: new Date(Date.now() - 150_000).toISOString() })
      renderSport({ data: { programs: [haut] } })
      expect(screen.getByRole('timer')).toHaveTextContent("C'est reparti : série 2")
      expect(beep).not.toHaveBeenCalled()
    })
  })

  test('record : pastille 🏆 et « Record ! », une seule fête par exo', async () => {
    renderSport({ data: { programs: [haut], sportSessions: history } })
    await click('Commencer')
    await click('✓ Série 1 faite')
    expect(screen.getByRole('status')).toHaveTextContent('🏆 Record ! 65 kg × 8')
    const pill = screen.getByRole('button', { name: 'Modifier la série 1' })
    expect(pill).toHaveTextContent('🏆')
    expect(pill).toHaveClass('bg-amber-400')
    await advance(2_500)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    await click('✓ Série 2 faite')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modifier la série 2' })).toHaveTextContent('🏆')

    await click('Charge −')
    await click('Charge −')
    await click('✓ Série 3 faite')
    expect(screen.getByRole('button', { name: 'Modifier la série 3' })).not.toHaveTextContent('🏆')
  })

  test('défi de charge sur l’exo : bandeau, puis réussi avec le record dans le même message', async () => {
    const ch = challenge({ domain: 'sport', target: { kind: 'weight', programExerciseId: 'bench', reps: 8, weightKg: 67.5, baseline: 62.5 } })
    renderSport({ data: { programs: [haut], sportSessions: history, challenges: [ch] } })
    await click('Commencer')
    expect(screen.getByText('🎯 Défi : 8 reps à 67,5 kg')).toBeInTheDocument()
    await click('Charge +')
    await click('✓ Série 1 faite')
    const toast = screen.getByRole('status')
    expect(within(toast).getByText('🏆 Record ! 67,5 kg × 8')).toBeInTheDocument()
    expect(within(toast).getByText('🎯 Défi réussi !')).toBeInTheDocument()
    expect(screen.getByText("🎯 Défi réussi ! Validé à l'enregistrement")).toBeInTheDocument()
  })

  test('défi de reps au poids du corps : « Défi réussi ! » seul', async () => {
    const ch = challenge({ domain: 'sport', target: { kind: 'reps', programExerciseId: 'bench', weightKg: 0, reps: 10, baseline: 8 } })
    renderSport({ data: { programs: [haut], challenges: [ch] } })
    await click('Commencer')
    expect(screen.getByText('🎯 Défi : 10 reps au poids du corps')).toBeInTheDocument()
    await click('✓ Série 1 faite')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await click('Reps +')
    await click('Reps +')
    await click('✓ Série 2 faite')
    expect(screen.getByRole('status')).toHaveTextContent(/^🎯 Défi réussi !$/)
    expect(screen.getByText("🎯 Défi réussi ! Validé à l'enregistrement")).toBeInTheDocument()
    await advance(2_500)
    await click('✓ Série 3 faite')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  test('« Commencer Bas » depuis l’accueil : directement sur le premier exo, « Changer » pour choisir', async () => {
    renderWithData(
      <Routes>
        <Route
          path="/log/sport"
          element={
            <>
              <LogSportPage />
              <Probe />
            </>
          }
        />
      </Routes>,
      { route: { pathname: '/log/sport', state: { programId: 'bas' } }, data: { programs: [haut, bas], sportSessions: history } },
    )
    expect(screen.getByRole('heading', { name: 'Squat' })).toBeInTheDocument()
    expect(loadLive()?.programId).toBe('bas')
    expect(screen.getByText('at /log/sport null')).toBeInTheDocument() // demande consommée
    await click('Changer')
    expect(screen.getByRole('heading', { name: 'Quelle séance ?' })).toBeInTheDocument()
    expect(loadLive()).toBeNull()
  })

  test('programme demandé inconnu ou sans exo : choix de la séance', () => {
    const empty = program({ id: 'vide', name: 'Vide', position: 2 })
    renderSport({ route: { pathname: '/log/sport', state: { programId: 'vide' } }, data: { programs: [haut, empty] } })
    expect(screen.getByRole('heading', { name: 'Quelle séance ?' })).toBeInTheDocument()
  })

  test('choix de la séance : présélection correcte quand les programmes arrivent après l’ouverture', async () => {
    const { rerender } = render(<Harness data={{}} loading />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
    rerender(<Harness data={{ programs: [haut, bas], sportSessions: [ss([], '2026-10-08', 'haut')] }} loading={false} />)
    expect(screen.getByRole('button', { name: 'Bas' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Haut' })).toHaveAttribute('aria-pressed', 'false')
    await click('Commencer')
    expect(screen.getByRole('heading', { name: 'Squat' })).toBeInTheDocument()
  })

  test('séance en cours pendant le chargement : « Chargement de ta séance… », pas la fin de séance', () => {
    saveLive({ id: 'live', programId: 'haut', startedAt: new Date().toISOString(), exerciseIndex: 0, exerciseId: 'bench', weightKg: 60, reps: 8, sets: [] })
    const { rerender } = render(<Harness data={{}} loading />)
    expect(screen.getByText('Chargement de ta séance…')).toBeInTheDocument()
    expect(screen.queryByText(/Séance terminée/)).not.toBeInTheDocument()
    rerender(<Harness data={{ programs: [haut] }} loading={false} />)
    expect(screen.getByRole('heading', { name: 'Développé couché' })).toBeInTheDocument()
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
    await user.click(screen.getAllByRole('radio', { name: '4' })[0])
    await user.click(screen.getAllByRole('radio', { name: '5' })[1])
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
    expect(await screen.findByText(`at /xp ${JSON.stringify({ result, domain: 'sport', logId: vi.mocked(actions.saveSportSession).mock.calls[0][0].id, momentDay: vi.mocked(actions.saveSportSession).mock.calls[0][0].day })}`)).toBeInTheDocument()
    expect(loadLive()).toBeNull()
  })

  test('« Précédent » ramène à l’exo d’avant, et depuis la fin de séance', async () => {
    renderSport({ data: { programs: [haut] } })
    await click('Commencer')
    expect(screen.queryByRole('button', { name: '‹ Précédent' })).not.toBeInTheDocument()
    await click('Exo suivant →')
    await click('‹ Précédent')
    expect(screen.getByRole('heading', { name: 'Développé couché' })).toBeInTheDocument()
    await click('Exo suivant →')
    await click('Fin de séance →')
    await click('‹ Revenir au dernier exo')
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
