import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'
import { addDays } from '../../domain/date'
import { ex, g, mkSong } from '../../test/factories'
import { renderWithData, type RenderWithDataOptions } from '../../test/renderWithData'
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
    expect(await screen.findByText(`at /xp ${JSON.stringify({ result, domain: 'guitar' })}`)).toBeInTheDocument()
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
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled()
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

  test('exos récents en premier, exo inconnu de l’historique ignoré', async () => {
    renderLog({ data: { guitarSessions: [g('2026-10-14', 30, [ex('ghost-1', 90), ex('sweep-3', 80)])] } })
    await userEvent.click(screen.getByRole('button', { name: '30' }))
    await next()
    const results = screen.getAllByRole('button', { name: /^\+ / })
    expect(results[0]).toHaveTextContent('Sweep picking ascendant 3')
    expect(screen.queryByText(/ghost/)).not.toBeInTheDocument()
  })

  test('créer un morceau par son nom l’ajoute à newSongs', async () => {
    const { actions } = renderLog()
    await userEvent.click(screen.getByRole('button', { name: '30' }))
    await next()
    await userEvent.type(screen.getByRole('searchbox'), 'Iron Man')
    await userEvent.click(screen.getByRole('button', { name: '+ Nouveau morceau « Iron Man »' }))
    await next()
    await finish()
    const draft = vi.mocked(actions.saveGuitarSession).mock.calls[0][0]
    expect(draft.newSongs).toEqual([{ id: expect.any(String), title: 'Iron Man', status: 'learning', masteredOn: null }])
    expect(draft.items).toEqual([{ kind: 'song', songId: draft.newSongs[0].id, markedMastered: false }])
  })
})
