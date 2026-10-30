import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { g } from '../test/factories'
import { icon } from '../test/icon'
import { renderWithData } from '../test/renderWithData'
import { AppRoutes } from './App'

const TODAY = '2026-10-15'

test('la navigation basse : 4 onglets, « Commencer » au centre', () => {
  renderWithData(<AppRoutes />)
  const nav = screen.getByRole('navigation', { name: 'Navigation principale' })
  expect(
    within(nav)
      .getAllByRole('link')
      .map((l) => [l.textContent, l.getAttribute('href')]),
  ).toEqual([
    ["Aujourd'hui", '/'],
    ['Plan', '/plan'],
    ['Progrès', '/progres'],
    ['Moi', '/moi'],
  ])
  expect(within(nav).getAllByRole('listitem')[2]).toContainElement(within(nav).getByRole('button', { name: 'Commencer la prochaine séance' }))
})

test.each([
  ['/morceaux', 'Morceaux'],
  ['/bibliotheque?vue=modeles', 'Modèles de séance'],
  ['/bibliotheque', 'Exercices'],
  ['/reglages', 'Réglages'],
  ['/semaine', 'Plan'],
  ['/marathon', 'Marathon'],
])('ancienne adresse %s : redirigée vers %s', async (route, title) => {
  renderWithData(<AppRoutes />, { route })
  expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
})

test.each([
  ['/strava', 'Courses Strava'],
  ['/marathon/profil', 'Mon marathon'],
])('ancienne adresse %s : redirigée vers « %s »', async (route, title) => {
  renderWithData(<AppRoutes />, { route })
  expect(await screen.findByText(title)).toBeInTheDocument()
})

test('« Commencer » au centre : lance la prochaine séance prévue, depuis n’importe quel onglet', async () => {
  renderWithData(<AppRoutes />, { route: '/progres' })
  await userEvent.click(screen.getByRole('button', { name: 'Commencer la prochaine séance' }))
  // Compte neuf : la guitare du jour, chrono lancé.
  expect(await screen.findByRole('button', { name: 'Pause' })).toBeInTheDocument()
})

test('« Commencer » au centre, journée bouclée : toutes les façons de commencer', async () => {
  renderWithData(<AppRoutes />, { route: '/progres', data: { guitarSessions: [g(TODAY, 60)] } })
  await userEvent.click(screen.getByRole('button', { name: 'Commencer une séance' }))
  const sheet = await screen.findByRole('dialog', { name: 'Commencer' })
  expect(within(sheet).getByRole('button', { name: 'Jouer maintenant' })).toBeInTheDocument()
  expect(within(sheet).getByRole('button', { name: /Corriger le dernier log/ })).toBeInTheDocument()
  await userEvent.click(within(sheet).getByRole('button', { name: 'Choisir une séance' }))
  expect(await screen.findByText('Pas encore de programme.')).toBeInTheDocument()
})

test('les écrans de log n’ont pas de navigation basse', () => {
  renderWithData(<AppRoutes />, { route: '/log/guitare' })
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
})

test('le chrono guitare n’a pas de navigation basse', async () => {
  renderWithData(<AppRoutes />, { route: '/jouer' })
  expect(icon(await screen.findByRole('button', { name: 'Démarrer' }), 'play')).toBeInTheDocument()
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
})
