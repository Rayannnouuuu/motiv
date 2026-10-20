import { screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { icon } from '../test/icon'
import { renderWithData } from '../test/renderWithData'
import { AppRoutes } from './App'

test('la navigation basse a 3 onglets', () => {
  renderWithData(<AppRoutes />)
  expect(screen.getByRole('link', { name: /Aujourd'hui/ })).toHaveAttribute('href', '/')
  expect(screen.getByRole('link', { name: /Progrès/ })).toHaveAttribute('href', '/progres')
  expect(screen.getByRole('link', { name: /Réglages/ })).toHaveAttribute('href', '/reglages')
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
