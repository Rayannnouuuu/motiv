import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { Route, Routes, useLocation } from 'react-router-dom'
import { g, mkSong } from '../../test/factories'
import { renderWithData, type RenderWithDataOptions } from '../../test/renderWithData'
import { SongsList } from './SongsList'

function Probe() {
  const loc = useLocation()
  return (
    <p>
      at {loc.pathname} {JSON.stringify(loc.state)}
    </p>
  )
}

const renderPage = (opts: RenderWithDataOptions = {}) =>
  renderWithData(
    <Routes>
      <Route path="/morceaux" element={<SongsList />} />
      <Route path="*" element={<Probe />} />
    </Routes>,
    { today: '2026-10-15', route: '/morceaux', ...opts },
  )

test('quatre statuts : en cours, à apprendre, proposés sans doublon, maîtrisés classés du plus dur ; statut modifiable', async () => {
  const learning = mkSong({ id: 's1', title: 'Paranoid' })
  const easy = mkSong({ id: 's2', title: 'Smoke on the Water', status: 'mastered', masteredOn: '2026-09-01' })
  const hard = mkSong({ id: 's3', title: 'Master of Puppets', status: 'mastered', masteredOn: '2026-10-01' })
  const unplayed = mkSong({ id: 's4', title: 'Iron Man' })
  const played = g('2026-10-10', 30, [{ kind: 'song', songId: 's1', markedMastered: false }])
  const { actions } = renderPage({ data: { songs: [learning, easy, hard, unplayed], guitarSessions: [played] } })

  const group = (name: string) => screen.getByRole('region', { name })
  expect(within(group('En cours')).getByText('Paranoid')).toBeInTheDocument()
  // Ajouté mais jamais joué : à apprendre, plus dans les proposés.
  expect(within(group('À apprendre')).getByText('Iron Man')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Jouer Iron Man' })).not.toBeInTheDocument()
  expect(screen.getByText('Proposés')).toBeInTheDocument()
  expect(screen.getByText('Maîtrisés · 2')).toBeInTheDocument()
  expect(screen.getByText('1. Master of Puppets')).toBeInTheDocument()
  expect(screen.getByText('2. Smoke on the Water')).toBeInTheDocument()

  // Toute la ligne s'ouvre ; le statut se change en grands boutons.
  await userEvent.click(screen.getByRole('button', { name: 'Ouvrir Paranoid' }))
  const sheet = screen.getByRole('dialog', { name: 'Paranoid' })
  expect(within(sheet).getByRole('button', { name: 'En cours' })).toHaveAttribute('aria-pressed', 'true')
  await userEvent.click(within(sheet).getByRole('button', { name: 'À entretenir' }))
  expect(actions.setSongStatus).toHaveBeenCalledWith('s1', 'maintain')
})

test('toucher un morceau proposé ouvre le log avec lui', async () => {
  renderPage()
  await userEvent.click(screen.getByRole('button', { name: 'Jouer Seven Nation Army' }))
  expect(screen.getByText('at /log/guitare {"songTitle":"Seven Nation Army"}')).toBeInTheDocument()
})

test('« Voir les N morceaux » déplie la liste des proposés', async () => {
  renderPage()
  await userEvent.click(screen.getByRole('button', { name: /Voir les \d+ morceaux/ }))
  expect(screen.getByRole('button', { name: 'Voir moins' })).toBeInTheDocument()
})

test('« Jouer ce morceau » depuis sa feuille ouvre le log avec lui', async () => {
  renderPage({ data: { songs: [mkSong({ id: 's1', title: 'Paranoid' })] } })
  await userEvent.click(screen.getByRole('button', { name: 'Ouvrir Paranoid' }))
  await userEvent.click(within(screen.getByRole('dialog', { name: 'Paranoid' })).getByRole('button', { name: 'Jouer ce morceau' }))
  expect(screen.getByText('at /log/guitare {"songTitle":"Paranoid"}')).toBeInTheDocument()
})

test('ma tablature : ajoutée depuis la feuille du morceau, enregistrée sur l’appareil', async () => {
  const { actions } = renderPage({ data: { songs: [mkSong({ id: 's1', title: 'Paranoid' })] } })
  await userEvent.click(screen.getByRole('button', { name: 'Ouvrir Paranoid' }))
  await userEvent.click(within(screen.getByRole('dialog', { name: 'Paranoid' })).getByRole('button', { name: 'Ajouter ma tablature' }))
  const sheet = await screen.findByRole('dialog', { name: 'Tablature · Paranoid' })
  expect(within(sheet).getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  await userEvent.type(within(sheet).getByLabelText('Tablature'), 'e|--0--|')
  await userEvent.click(within(sheet).getByRole('button', { name: 'Enregistrer' }))
  expect(actions.setSongTab).toHaveBeenCalledWith('s1', 'e|--0--|')
})
