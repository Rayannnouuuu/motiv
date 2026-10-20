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

  expect(screen.getByRole('combobox', { name: 'Statut · Paranoid' })).toHaveValue('learning')
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Statut · Paranoid' }), 'À entretenir')
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
