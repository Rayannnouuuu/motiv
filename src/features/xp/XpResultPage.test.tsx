import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { expect, test } from 'vitest'
import { renderWithData } from '../../test/renderWithData'
import { XpResultPage } from './XpResultPage'

const routes = (
  <Routes>
    <Route path="/xp" element={<XpResultPage />} />
    <Route path="/" element={<p>accueil</p>} />
  </Routes>
)

test('affiche le total, le détail et la jauge du domaine', () => {
  const result = { total: 68, lines: [{ label: '45 min jouées', xp: 45 }, { label: 'Record de tempo · Legato 4', xp: 10 }] }
  renderWithData(routes, { route: { pathname: '/xp', state: { result, domain: 'guitar' } } })
  expect(screen.getByText('+68 XP')).toBeInTheDocument()
  expect(screen.getByText('45 min jouées')).toBeInTheDocument()
  expect(screen.getByText('Record de tempo · Legato 4')).toBeInTheDocument()
  expect(screen.getByRole('progressbar', { name: /Guitare/ })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Continuer' })).toHaveAttribute('href', '/')
})

test('sans résultat : retour à l’accueil', () => {
  renderWithData(routes, { route: '/xp' })
  expect(screen.getByText('accueil')).toBeInTheDocument()
})
