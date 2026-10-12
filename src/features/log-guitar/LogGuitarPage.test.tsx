import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'
import { ActionsContext, AppDataContext } from '../../data/AppDataContext'
import { addDays } from '../../domain/date'
import { EMPTY_DATA } from '../../domain/types'
import { challenge, ex, g, mkSong } from '../../test/factories'
import { fakeActions, renderWithData, type RenderWithDataOptions } from '../../test/renderWithData'
import { loadPractice, savePractice, startPractice } from '../practice/practiceSession'
import { LogGuitarPage } from './LogGuitarPage'

const today = '2026-10-15'

function Probe() {
  const loc = useLocation()
  return <p>at {loc.pathname} {JSON.stringify(loc.state)}</p>
}

const renderLog = (opts: RenderWithDataOptions = {}) =>
  renderWithData(
    <Routes>
      <Route path="/log/guitare" element={<LogGuitarPage />} />
      <Route path="*" element={<Probe />} />
    </Routes>,
    { today, route: '/log/guitare', ...opts },
  )

const next = () => userEvent.click(screen.getByRole('button', { name: 'Suivant' }))

describe('LogGuitarPage', () => {
  test('parcours complet', async () => {
    const paranoid = mkSong({ id: 'song-p', title: 'Paranoid' })
    const result = { total: 245, lines: [{ label: '45 min jouées', xp: 45 }] }
    const { actions } = renderLog({
      data: { guitarSessions: [g('2026-10-10', 30, [ex('legato-4', 100)])], songs: [paranoid] },
      actions: { saveGuitarSession: vi.fn(async () => result) },
    })

    await userEvent.click(screen.getByRole('button', { name: '45' }))
    await next()

    await userEvent.type(screen.getByRole('searchbox'), 'legato 4')
    await userEvent.click(screen.getByRole('button', { name: '+ Legato 4' }))
    const tempo = screen.getByLabelText('Tempo max · Legato 4')
    expect(tempo).toHaveValue(100)
    await userEvent.clear(tempo)
    await userEvent.type(tempo, '104')

    await userEvent.type(screen.getByRole('searchbox'), 'para')
    await userEvent.click(screen.getByRole('button', { name: '+ Paranoid' }))
    await userEvent.click(screen.getByLabelText('Maîtrisé · Paranoid'))
    await next()

    const save = screen.getByRole('button', { name: 'Enregistrer' })
    expect(save).toBeDisabled()
    await userEvent.click(within(screen.getByRole('radiogroup', { name: 'Temps oublié' })).getByRole('radio', { name: '4' }))
    await userEvent.click(within(screen.getByRole('radiogroup', { name: "Envie d'y retourner" })).getByRole('radio', { name: '5' }))
    await userEvent.click(save)

    expect(actions.saveGuitarSession).toHaveBeenCalledWith({
      id: expect.any(String),
      day: today,
      durationMin: 45,
      items: [
        { kind: 'exercise', exerciseId: 'legato-4', maxBpm: 104 },
        { kind: 'song', songId: 'song-p', markedMastered: true },
      ],
      newSongs: [],
      flowRating: 4,
      desireRating: 5,
    })
    expect(await screen.findByText(`at /xp ${JSON.stringify({ result, domain: 'guitar', logId: vi.mocked(actions.saveGuitarSession).mock.calls[0][0].id })}`)).toBeInTheDocument()
  })

  async function finish() {
    await userEvent.click(within(screen.getByRole('radiogroup', { name: 'Temps oublié' })).getByRole('radio', { name: '3' }))
    await userEvent.click(within(screen.getByRole('radiogroup', { name: "Envie d'y retourner" })).getByRole('radio', { name: '3' }))
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
  }

  test('« Hier » envoie la veille, étape 2 vide autorisée', async () => {
    const { actions } = renderLog()
    await userEvent.click(screen.getByRole('button', { name: '30' }))
    await userEvent.click(screen.getByRole('button', { name: 'Hier' }))
    await next()
    await next()
    await finish()
    expect(actions.saveGuitarSession).toHaveBeenCalledWith(expect.objectContaining({ day: addDays(today, -1), durationMin: 30, items: [] }))
  })

  test('durée reçue de l’accueil : « autre » présélectionné', () => {
    renderLog({ route: { pathname: '/log/guitare', state: { durationMin: 25 } } })
    expect(screen.getByRole('button', { name: 'autre' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Durée en minutes')).toHaveValue(25)
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeEnabled()
  })

  test('durée « autre » invalide : Suivant désactivé', async () => {
    renderLog()
    // Sans état (rappel push) : les minutes qui manquent aujourd'hui sont présélectionnées.
    expect(screen.getByRole('button', { name: '60' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'autre' }))
    const input = screen.getByLabelText('Durée en minutes')
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled()
    await userEvent.type(input, '0')
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled()
    await userEvent.clear(input)
    await userEvent.type(input, '601')
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled()
    await userEvent.clear(input)
    await userEvent.type(input, '90')
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeEnabled()
  })

  test('sans état : les minutes restantes du jour sont présélectionnées ; rien quand l’objectif est atteint', () => {
    const { unmount } = renderLog({ data: { guitarSessions: [g(today, 35)] } })
    expect(screen.getByRole('button', { name: 'autre' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Durée en minutes')).toHaveValue(25)
    unmount()
    renderLog({ data: { guitarSessions: [g(today, 60)] } })
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled()
  })

  test('ouvert pendant le chargement : présélection refaite avec les minutes du jour', () => {
    const { rerender } = renderLog({ loading: true })
    expect(screen.getByRole('button', { name: '60' })).toHaveAttribute('aria-pressed', 'true')
    rerender(
      <MemoryRouter initialEntries={['/log/guitare']}>
        <AppDataContext.Provider value={{ data: { ...EMPTY_DATA, guitarSessions: [g(today, 30)] }, pendingCount: 0, rejected: [], today, loading: false, error: null }}>
          <ActionsContext.Provider value={fakeActions()}>
            <Routes>
              <Route path="/log/guitare" element={<LogGuitarPage />} />
            </Routes>
          </ActionsContext.Provider>
        </AppDataContext.Provider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: '30' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('depuis le chrono : notes directement, contenu pré-rempli, id de la séance, chrono effacé', async () => {
    const paranoid = mkSong({ id: 'song-p', title: 'Paranoid' })
    savePractice({ ...startPractice(new Date('2026-10-15T16:00:00Z'), 'practice-1'), exercises: ['legato-4'], songs: ['song-p'] })
    const state = {
      durationMin: 42,
      step: 2,
      day: today,
      practiceId: 'practice-1',
      entries: [
        { kind: 'exercise', exerciseId: 'legato-4', bpm: '100' },
        { kind: 'exercise', exerciseId: 'ghost-1', bpm: '90' },
        { kind: 'song', songId: 'song-p', mastered: false },
        { kind: 'song', songId: 'song-inconnu', mastered: false },
      ],
    }
    const { actions } = renderLog({ route: { pathname: '/log/guitare', state }, data: { songs: [paranoid] } })
    expect(screen.getByRole('heading', { name: "Comment c'était ?" })).toBeInTheDocument()

    // « ‹ Retour » : le contenu pré-rempli, puis la durée.
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }))
    const content = screen.getByRole('list', { name: 'Travaillé pendant la séance' })
    expect(within(content).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByLabelText('Tempo max · Legato 4')).toHaveValue(100)
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }))
    expect(screen.getByLabelText('Durée en minutes')).toHaveValue(42)
    await next()
    await next()

    await finish()
    expect(actions.saveGuitarSession).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'practice-1',
        day: today,
        durationMin: 42,
        items: [
          { kind: 'exercise', exerciseId: 'legato-4', maxBpm: 100 },
          { kind: 'song', songId: 'song-p', markedMastered: false },
        ],
      }),
    )
    expect(loadPractice()).toBeNull()
  })

  test('chrono d’une autre séance : pas effacé à l’enregistrement', async () => {
    savePractice(startPractice(new Date('2026-10-15T16:00:00Z'), 'en-cours'))
    renderLog({ route: { pathname: '/log/guitare', state: { durationMin: 30, step: 2 } } })
    await finish()
    expect(loadPractice()?.id).toBe('en-cours')
  })

  test('séance commencée la veille : « Hier » présélectionné', () => {
    renderLog({ route: { pathname: '/log/guitare', state: { durationMin: 30, day: addDays(today, -1) } } })
    expect(screen.getByRole('button', { name: 'Hier' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('exos du jour en premier, puis récents ; exo inconnu ignoré', async () => {
    renderLog({ data: { guitarSessions: [g('2026-10-14', 30, [ex('ghost-1', 90), ex('sweep-3', 80)])] } })
    await userEvent.click(screen.getByRole('button', { name: '30' }))
    await next()
    const results = screen.getAllByRole('button', { name: /^\+ / }).map((b) => b.textContent)
    // Plan : suite de la dernière catégorie (sweep 4), puis 2 autres ; ensuite les récents.
    expect(results[0]).toMatch(/^\+ Sweep.*4du jour$/)
    expect(results.filter((r) => r?.endsWith('du jour'))).toHaveLength(3)
    expect(results[3]).toBe('+ Sweep picking ascendant 3')
    expect(screen.queryByText(/ghost/)).not.toBeInTheDocument()
  })

  test('ouvert depuis la fiche d’un exo : déjà ajouté avec le record', async () => {
    renderLog({
      route: { pathname: '/log/guitare', state: { exerciseId: 'legato-4' } },
      data: { guitarSessions: [g('2026-10-10', 30, [ex('legato-4', 100)])] },
    })
    await userEvent.click(screen.getByRole('button', { name: '30' }))
    await next()
    expect(screen.getByLabelText('Tempo max · Legato 4')).toHaveValue(100)
  })

  test('tempo du métronome de la fiche exo : prioritaire sur le record', async () => {
    renderLog({
      route: { pathname: '/log/guitare', state: { exerciseId: 'legato-4', bpm: 92 } },
      data: { guitarSessions: [g('2026-10-10', 30, [ex('legato-4', 100)])] },
    })
    await userEvent.click(screen.getByRole('button', { name: '30' }))
    await next()
    expect(screen.getByLabelText('Tempo max · Legato 4')).toHaveValue(92)
  })

  test('morceau du catalogue : ajouté automatiquement à tes morceaux', async () => {
    const { actions } = renderLog()
    await userEvent.click(screen.getByRole('button', { name: '30' }))
    await next()
    await userEvent.type(screen.getByRole('searchbox'), 'sabbath')
    await userEvent.click(screen.getByRole('button', { name: '+ Iron Man · Black Sabbath' }))
    expect(screen.queryByRole('button', { name: /Nouveau morceau/ })).not.toBeInTheDocument()
    await next()
    await finish()
    const draft = vi.mocked(actions.saveGuitarSession).mock.calls[0][0]
    expect(draft.newSongs).toEqual([{ id: expect.any(String), title: 'Iron Man', status: 'learning', masteredOn: null }])
  })

  test('créer un morceau par son nom l’ajoute à newSongs', async () => {
    const { actions } = renderLog()
    await userEvent.click(screen.getByRole('button', { name: '30' }))
    await next()
    await userEvent.type(screen.getByRole('searchbox'), 'Ma compo')
    await userEvent.click(screen.getByRole('button', { name: '+ Nouveau morceau « Ma compo »' }))
    await next()
    await finish()
    const draft = vi.mocked(actions.saveGuitarSession).mock.calls[0][0]
    expect(draft.newSongs).toEqual([{ id: expect.any(String), title: 'Ma compo', status: 'learning', masteredOn: null }])
    expect(draft.items).toEqual([{ kind: 'song', songId: draft.newSongs[0].id, markedMastered: false }])
  })

  test('défi en cours : proposé en premier, objectif affiché sur l’exo', async () => {
    const c = challenge({ target: { kind: 'bpm', exerciseId: 'legato-6', bpm: 96, baseline: null } })
    renderLog({ data: { challenges: [c] } })
    await userEvent.click(screen.getByRole('button', { name: '30' }))
    await next()
    const first = screen.getAllByRole('button', { name: /^\+ / })[0]
    expect(first).toHaveTextContent('Legato sur une corde 6')
    expect(first).toHaveTextContent('🎯 défi')
    await userEvent.click(first)
    expect(screen.getByText('🎯 Défi : note ton tempo max, objectif 96 bpm')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Tempo max · Legato sur une corde 6'), '96')
    expect(screen.getByText('🎯 Défi réussi : 96 bpm atteint ✓')).toBeInTheDocument()
  })
})
