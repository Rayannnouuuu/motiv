import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'
import { AppRoutes } from './App'

test('la navigation basse a 3 onglets', () => {
  render(
    <MemoryRouter>
      <AppRoutes />
    </MemoryRouter>,
  )
  const nav = screen.getByRole('navigation')
  expect(nav).toHaveTextContent("Aujourd'hui")
  expect(screen.getByRole('link', { name: /Aujourd'hui/ })).toHaveAttribute('href', '/')
  expect(screen.getByRole('link', { name: /Progrès/ })).toHaveAttribute('href', '/progres')
  expect(screen.getByRole('link', { name: /Réglages/ })).toHaveAttribute('href', '/reglages')
})
