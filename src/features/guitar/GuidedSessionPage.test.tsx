import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { mkSong } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { GuidedSessionPage } from './GuidedSessionPage'

function Landed() {
  const loc = useLocation()
  return <output data-testid="landed">{`${loc.pathname} ${JSON.stringify(loc.state)}`}</output>
}

const renderPage = () =>
  renderWithData(
    <Routes>
      <Route path="/" element={<GuidedSessionPage />} />
      <Route path="*" element={<Landed />} />
    </Routes>,
    { today: '2026-11-02', data: { songs: [mkSong({ id: 's1', title: 'Paranoid' })] } },
  )

describe('séance guidée', () => {
  test('durée 15 min proposée aux débutants, avec la mise en garde douleur', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /15/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/au poignet ou à l’avant-bras/)).toBeInTheDocument()
  })

  test('construit la séance, démarre 3 compétences, mesure, fait le bilan puis ouvre le log avec la note', async () => {
    const { actions } = renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Construire ma séance' }))
    await waitFor(() => expect(actions.saveGuitarState).toHaveBeenCalledTimes(1))
    const first = (actions.saveGuitarState as unknown as { mock: { calls: [{ progress: { skills: Record<string, unknown> } }][] } }).mock.calls[0][0]
    expect(Object.keys(first.progress.skills)).toHaveLength(3)

    // Bloc 1 : échauffement avec métronome ; objectif affiché
    expect(await screen.findByText(/Objectif :/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Chromatique 1-2-3-4, corde de Mi grave/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Bloc suivant' }))

    // Bloc 2 : focus = première compétence en cours ; mesure et essai noté (checklist complète)
    expect(screen.getByText(/Focus · 10 min|Focus · 6 min/)).toBeInTheDocument()
    for (const box of screen.queryAllByRole('checkbox')) await userEvent.click(box)
    await userEvent.click(screen.getByRole('button', { name: 'Noter l’essai' }))
    await waitFor(() => expect(actions.saveGuitarState).toHaveBeenCalledTimes(2))

    // Les blocs suivants, puis le bilan
    while (screen.queryByRole('button', { name: 'Bloc suivant' })) await userEvent.click(screen.getByRole('button', { name: 'Bloc suivant' }))
    await userEvent.click(screen.getByRole('button', { name: 'Terminer' }))
    expect(await screen.findByRole('heading', { name: 'Bilan de la séance' })).toBeInTheDocument()
    await userEvent.type(screen.getByPlaceholderText('Une phrase, ou rien'), 'le La')
    await userEvent.click(screen.getByRole('button', { name: 'Noter la séance' }))
    const landed = await screen.findByTestId('landed')
    expect(landed).toHaveTextContent('/log/guitare')
    expect(landed).toHaveTextContent('"step":2')
    expect(landed).toHaveTextContent('Ce qui coince : le La')
    expect(landed).toHaveTextContent('"exerciseId":"chromatic-1"')
  })
})
