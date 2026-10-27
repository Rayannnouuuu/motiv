import { screen, waitFor, within } from '@testing-library/react'
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

const renderPage = (songs = [mkSong({ id: 's1', title: 'Paranoid' })]) =>
  renderWithData(
    <Routes>
      <Route path="/" element={<GuidedSessionPage />} />
      <Route path="*" element={<Landed />} />
    </Routes>,
    { today: '2026-11-02', data: { songs } },
  )

type Saved = { progress: { skills: Record<string, { status: string; attempts: unknown[] }> } }
const saved = (actions: { saveGuitarState: unknown }, n: number) => (actions.saveGuitarState as { mock: { calls: [Saved][] } }).mock.calls[n][0]

describe('séance guidée', () => {
  test('durée 15 min proposée aux débutants, avec la mise en garde douleur', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /15/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/au poignet ou à l’avant-bras/)).toBeInTheDocument()
  })

  test('accordage, son clair et posture : une fenêtre avant de jouer, pas des blocs de la séance', async () => {
    const { actions } = renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Construire ma séance' }))
    const sheet = await screen.findByRole('dialog', { name: 'Avant de jouer' })
    expect(within(sheet).getAllByRole('checkbox')).toHaveLength(3)
    for (const box of within(sheet).getAllByRole('checkbox')) await userEvent.click(box)
    await userEvent.click(within(sheet).getByRole('button', { name: 'C’est parti' }))
    await waitFor(() => expect(actions.saveGuitarState).toHaveBeenCalledTimes(1))
    const skills = saved(actions, 0).progress.skills
    expect(['tune', 'clean-tone', 'posture'].map((id) => skills[id].attempts.length)).toEqual([1, 1, 1])
    // La séance commence par l'échauffement, puis le focus : jamais « Accorder sa guitare » ni « Régler un son clair ».
    expect(await screen.findByText(/Échauffement · 2 min/)).toBeInTheDocument()
    expect(screen.queryByText('Accorder sa guitare')).not.toBeInTheDocument()
  })

  test('chaque bloc montre son exercice (tablature, métronome) et propose d’autres exercices ; le morceau se choisit', async () => {
    const { actions } = renderPage([mkSong({ id: 'a', title: 'Zed' }), mkSong({ id: 'b', title: 'Alpha' })])
    await userEvent.click(screen.getByRole('button', { name: /^30/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Construire ma séance' }))
    await userEvent.click(await screen.findByRole('button', { name: 'C’est parti' }))
    await screen.findByText(/Échauffement · 4 min/)
    expect(screen.getByRole('img', { name: 'Tablature' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lancer le métronome' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Bloc suivant' }))

    // Focus : une compétence jouable (tempo), avec la tablature, le métronome et un choix d'exercices
    expect(screen.getByText(/Focus · 10 min/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Tablature' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lancer le métronome' })).toBeInTheDocument()
    const choice = screen.getByRole('combobox', { name: 'Exercice' })
    expect(within(choice).getAllByRole('option').length).toBeGreaterThan(1)
    await userEvent.click(screen.getByRole('switch', { name: 'Propre' }))
    await userEvent.click(screen.getByRole('button', { name: 'Noter l’essai' }))
    await waitFor(() => expect(actions.saveGuitarState).toHaveBeenCalledTimes(2))

    // Entretien, puis répertoire : des morceaux « à apprendre » sont proposés
    await userEvent.click(screen.getByRole('button', { name: 'Bloc suivant' }))
    await userEvent.click(screen.getByRole('button', { name: 'Bloc suivant' }))
    const songs = screen.getByRole('combobox', { name: 'Morceau' })
    expect(
      within(songs)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Alpha', 'Zed'])
  })

  test('parcours complet : bilan, puis le log s’ouvre avec la note « ce qui coince » et le morceau', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Construire ma séance' }))
    await userEvent.click(await screen.findByRole('button', { name: 'C’est parti' }))
    await screen.findByText(/Objectif :/)
    while (screen.queryByRole('button', { name: 'Bloc suivant' })) await userEvent.click(screen.getByRole('button', { name: 'Bloc suivant' }))
    // Dernier bloc : le répertoire, la section jouée est cochée avant de terminer.
    await userEvent.click(screen.getByRole('checkbox', { name: 'Section jouée' }))
    await userEvent.click(screen.getByRole('button', { name: 'Terminer' }))
    expect(await screen.findByRole('heading', { name: 'Bilan de la séance' })).toBeInTheDocument()
    await userEvent.type(screen.getByPlaceholderText('Une phrase, ou rien'), 'le La')
    await userEvent.click(screen.getByRole('button', { name: 'Noter la séance' }))
    const landed = await screen.findByTestId('landed')
    expect(landed).toHaveTextContent('/log/guitare')
    expect(landed).toHaveTextContent('Ce qui coince : le La')
    expect(landed).toHaveTextContent('"songId":"s1"')
    expect(landed).toHaveTextContent('"exerciseId":"chromatic-1"')
  })
})
