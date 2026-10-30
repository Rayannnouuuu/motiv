import { EXERCISES } from '../../content/exercises'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { ex, g } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { ExercisesPage, ModelsPage, SongsPage } from './LibraryPage'

test('exercices : base guitare par catégorie avec mon meilleur tempo, puis la bibliothèque sport', () => {
  renderWithData(<ExercisesPage />, { route: '/moi/exercices', data: { guitarSessions: [g('2026-10-12', 30, [ex('scales-1', 55)])] } })
  const scales = screen.getByRole('region', { name: 'Guitare · Gammes' })
  const first = within(scales).getAllByRole('link')[0]
  expect(first).toHaveAttribute('href', '/exo/scales-1')
  expect(first).toHaveTextContent('55 bpm')
  expect(screen.getAllByRole('link').filter((l) => l.getAttribute('href')?.startsWith('/exo/')).length).toBe(EXERCISES.length)
  expect(screen.getByRole('button', { name: 'Modifier Squat' })).toHaveTextContent('Quadriceps · bas du corps · 6-10 reps')
})

test('une page par chose, avec retour vers Moi', () => {
  renderWithData(<SongsPage />, { route: '/moi/morceaux' })
  expect(screen.getByRole('heading', { name: 'Morceaux', level: 1 })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Moi/ })).toHaveAttribute('href', '/moi')
})

test('modèles de séance : leur page', () => {
  renderWithData(<ModelsPage />, { route: '/moi/modeles' })
  expect(screen.getByRole('heading', { name: 'Modèles de séance', level: 1 })).toBeInTheDocument()
})

test('modifier un mouvement : nom, partie du corps, fourchette', async () => {
  const { actions } = renderWithData(<ExercisesPage />, { route: '/moi/exercices' })
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
