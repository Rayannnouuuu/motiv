import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { mkSong } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { SongsPage } from './SongsPage'

const today = '2026-10-15'

test('en cours, proposés sans bouton d’ajout, maîtrisés classés du plus dur', async () => {
  const learning = mkSong({ id: 's1', title: 'Paranoid' })
  const easy = mkSong({ id: 's2', title: 'Smoke on the Water', status: 'mastered', masteredOn: '2026-09-01' })
  const hard = mkSong({ id: 's3', title: 'Master of Puppets', status: 'mastered', masteredOn: '2026-10-01' })
  const { actions } = renderWithData(<SongsPage />, { today, data: { songs: [learning, easy, hard] } })

  expect(screen.getByText('Proposés')).toBeInTheDocument()
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

test('toucher un morceau proposé le passe en cours', async () => {
  const { actions } = renderWithData(<SongsPage />, { today })
  await userEvent.click(screen.getByRole('button', { name: 'Travailler Seven Nation Army' }))
  expect(actions.saveSong).toHaveBeenCalledWith({ id: expect.any(String), title: 'Seven Nation Army', status: 'learning', masteredOn: null })
})

test('« Voir les N morceaux » déplie la liste des proposés', async () => {
  renderWithData(<SongsPage />, { today })
  await userEvent.click(screen.getByRole('button', { name: /Voir les \d+ morceaux/ }))
  expect(screen.getByRole('button', { name: 'Voir moins' })).toBeInTheDocument()
})
