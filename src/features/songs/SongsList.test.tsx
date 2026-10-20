import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { Route, Routes, useLocation } from 'react-router-dom'
import { g, mkSong } from '../../test/factories'
import { renderWithData, type RenderWithDataOptions } from '../../test/renderWithData'
import { SongsList } from './SongsList'

function Probe() {
  const loc = useLocation()
  return <p>at {loc.pathname} {JSON.stringify(loc.state)}</p>
}

const renderPage = (opts: RenderWithDataOptions = {}) =>
  renderWithData(
    <Routes>
      <Route path="/morceaux" element={<SongsList />} />
      <Route path="*" element={<Probe />} />
    </Routes>,
    { today: '2026-10-15', route: '/morceaux', ...opts },
  )

const today = '2026-10-15'

test('en cours, proposés sans bouton d’ajout, maîtrisés classés du plus dur', async () => {
  const learning = mkSong({ id: 's1', title: 'Paranoid' })
  const easy = mkSong({ id: 's2', title: 'Smoke on the Water', status: 'mastered', masteredOn: '2026-09-01' })
  const hard = mkSong({ id: 's3', title: 'Master of Puppets', status: 'mastered', masteredOn: '2026-10-01' })
  const unplayed = mkSong({ id: 's4', title: 'Iron Man' })
  const played = g('2026-10-10', 30, [{ kind: 'song', songId: 's1', markedMastered: false }])
  const { actions } = renderPage({ data: { songs: [learning, easy, hard, unplayed], guitarSessions: [played] } })

  expect(screen.getByText('Proposés')).toBeInTheDocument()
  // Ajouté mais jamais joué : reste dans les proposés, pas en cours.
  expect(screen.getByRole('button', { name: 'Jouer Iron Man' })).toBeInTheDocument()
  expect(screen.queryByLabelText('Maîtrisé · Iron Man')).not.toBeInTheDocument()
  // Déjà joués : pas reproposés.
  expect(screen.queryAllByText('Paranoid')).toHaveLength(1)
  expect(screen.getByText('Maîtrisés · 2')).toBeInTheDocument()
  expect(screen.getByText('1. Master of Puppets')).toBeInTheDocument()
  expect(screen.getByText('2. Smoke on the Water')).toBeInTheDocument()

  await userEvent.click(screen.getByLabelText('Maîtrisé · Paranoid'))
  expect(actions.saveSong).toHaveBeenCalledWith({ ...learning, status: 'mastered', masteredOn: today })
  await userEvent.click(screen.getByLabelText('Maîtrisé · Smoke on the Water'))
  expect(actions.saveSong).toHaveBeenCalledWith({ ...easy, status: 'learning', masteredOn: null })
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
