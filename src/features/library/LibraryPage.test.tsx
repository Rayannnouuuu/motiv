import { EXERCISES } from '../../content/exercises'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { ex, g } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { LibraryPage } from './LibraryPage'

test('exercices : base guitare par catégorie avec mon meilleur tempo, puis la bibliothèque sport', () => {
  renderWithData(<LibraryPage />, { route: '/bibliotheque', data: { guitarSessions: [g('2026-10-12', 30, [ex('scales-1', 55)])] } })
  const scales = screen.getByRole('region', { name: 'Guitare · Gammes' })
  const first = within(scales).getAllByRole('link')[0]
  expect(first).toHaveAttribute('href', '/exo/scales-1')
  expect(first).toHaveTextContent('55 bpm')
  expect(screen.getAllByRole('link').length).toBe(EXERCISES.length)
  expect(screen.getByRole('button', { name: 'Modifier Squat' })).toHaveTextContent('Quadriceps · bas du corps · 6-10 reps')
})

test('la vue se choisit et vit dans l’adresse', async () => {
  renderWithData(<LibraryPage />, { route: '/bibliotheque?vue=modeles' })
  expect(screen.getByRole('button', { name: 'Modèles' })).toHaveAttribute('aria-pressed', 'true')
  await userEvent.click(screen.getByRole('button', { name: 'Morceaux' }))
  expect(screen.getByRole('button', { name: 'Morceaux' })).toHaveAttribute('aria-pressed', 'true')
})

test('modifier un mouvement : nom, partie du corps, fourchette', async () => {
  const { actions } = renderWithData(<LibraryPage />, { route: '/bibliotheque' })
  await userEvent.click(screen.getByRole('button', { name: 'Modifier Squat' }))
  const name = await screen.findByLabelText('Nom du mouvement')
  await userEvent.clear(name)
  await userEvent.type(name, 'Squat barre haute')
  await userEvent.clear(screen.getByLabelText('Reps maximum'))
  await userEvent.type(screen.getByLabelText('Reps maximum'), '8')
  await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
  expect(vi.mocked(actions.saveMovement)).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'squat', name: 'Squat barre haute', body: 'lower', repRange: [6, 8] }),
  )
})
