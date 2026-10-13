import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { LoginPage } from './LoginPage'

vi.mock('../../data/supabase', () => ({ supabase: { auth: {} } }))

afterEach(() => vi.unstubAllGlobals())

test('dans Safari : connexion par lien email proposée', () => {
  render(<LoginPage />)
  expect(screen.getByRole('button', { name: 'Recevoir un lien par email' })).toBeInTheDocument()
})

test('appli installée sur l’écran d’accueil : pas de lien email (il s’ouvrirait dans Safari et échouerait)', () => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(display-mode: standalone)' }))
  render(<LoginPage />)
  expect(screen.queryByRole('button', { name: 'Recevoir un lien par email' })).not.toBeInTheDocument()
  expect(screen.getByText(/Ouvre Motiv dans Safari/)).toBeInTheDocument()
})
