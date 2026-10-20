import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { icon } from '../test/icon'
import { renderWithData } from '../test/renderWithData'
import { AppRoutes } from './App'

test('la navigation basse a 4 onglets : Aujourd’hui, Progrès, Bibliothèque, Moi', () => {
  renderWithData(<AppRoutes />)
  const links = within(screen.getByRole('navigation')).getAllByRole('link')
  expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
    ["Aujourd'hui", '/'],
    ['Progrès', '/progres'],
    ['Bibliothèque', '/bibliotheque'],
    ['Moi', '/moi'],
  ])
})

test.each([
  ['/morceaux', 'Bibliothèque'],
  ['/reglages', 'Moi'],
])('ancienne adresse %s : redirigée vers %s', async (route, title) => {
  renderWithData(<AppRoutes />, { route })
  expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument()
})

test('« Commencer » sur les écrans à onglets : guitare ou sport en deux taps', async () => {
  renderWithData(<AppRoutes />, { route: '/progres' })
  await userEvent.click(screen.getByRole('button', { name: 'Commencer' }))
  const sheet = await screen.findByRole('dialog', { name: 'Commencer' })
  expect(within(sheet).getByRole('button', { name: 'Jouer maintenant' })).toBeInTheDocument()
  await userEvent.click(within(sheet).getByRole('button', { name: 'Choisir une séance' }))
  expect(await screen.findByText('Pas encore de programme.')).toBeInTheDocument()
})

test('les écrans de log n’ont pas de navigation basse', () => {
  renderWithData(<AppRoutes />, { route: '/log/guitare' })
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
})

test('le chrono guitare n’a pas de navigation basse', () => {
  renderWithData(<AppRoutes />, { route: '/jouer' })
  expect(icon(screen.getByRole('button', { name: 'Démarrer' }), 'play')).toBeInTheDocument()
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
})
