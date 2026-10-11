import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { renderWithData } from '../../test/renderWithData'
import { PendingBanner } from '../../ui/PendingBanner'
import { AuthGate } from './AuthGate'

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
  signInWithOtp: vi.fn(async () => ({ error: null })),
  signInWithPassword: vi.fn(async () => ({ error: null })),
}))
vi.mock('../../data/supabase', () => ({ supabase: { auth } }))

beforeEach(() => vi.clearAllMocks())

test('sans session : écran de connexion', async () => {
  auth.getSession.mockResolvedValue({ data: { session: null } })
  render(<AuthGate>appli</AuthGate>)
  expect(await screen.findByLabelText('Email')).toBeInTheDocument()
  expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
  expect(screen.queryByText('appli')).not.toBeInTheDocument()
})

test('envoi du lien magique vers /motiv/', async () => {
  auth.getSession.mockResolvedValue({ data: { session: null } })
  render(<AuthGate>appli</AuthGate>)
  await userEvent.type(await screen.findByLabelText('Email'), 'moi@exemple.fr')
  await userEvent.click(screen.getByRole('button', { name: 'Recevoir un lien par email' }))
  expect(auth.signInWithOtp).toHaveBeenCalledWith({
    email: 'moi@exemple.fr',
    options: { emailRedirectTo: `${location.origin}/motiv/`, shouldCreateUser: false },
  })
  expect(await screen.findByText('Lien envoyé, ouvre ton email')).toBeInTheDocument()
})

test('erreur d’envoi affichée', async () => {
  auth.getSession.mockResolvedValue({ data: { session: null } })
  auth.signInWithOtp.mockResolvedValueOnce({ error: { message: 'Signups not allowed' } } as never)
  render(<AuthGate>appli</AuthGate>)
  await userEvent.type(await screen.findByLabelText('Email'), 'x@y.fr')
  await userEvent.click(screen.getByRole('button', { name: 'Recevoir un lien par email' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Signups not allowed')
})

test('connexion par mot de passe, erreur traduite', async () => {
  auth.getSession.mockResolvedValue({ data: { session: null } })
  auth.signInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } } as never)
  render(<AuthGate>appli</AuthGate>)
  await userEvent.type(await screen.findByLabelText('Email'), 'moi@exemple.fr')
  await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret123')
  await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
  expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'moi@exemple.fr', password: 'secret123' })
  expect(await screen.findByRole('alert')).toHaveTextContent('Email ou mot de passe incorrect')
})

test('avec session : l’appli est rendue', async () => {
  auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
  render(<AuthGate>appli</AuthGate>)
  expect(await screen.findByText('appli')).toBeInTheDocument()
})

test('PendingBanner', () => {
  const { unmount } = renderWithData(<PendingBanner />, { pendingCount: 2 })
  expect(screen.getByText("2 logs en attente d'envoi")).toBeInTheDocument()
  unmount()
  renderWithData(<PendingBanner />, { pendingCount: 1 })
  expect(screen.getByText("1 log en attente d'envoi")).toBeInTheDocument()
})

test('PendingBanner caché à 0', () => {
  const { container } = renderWithData(<PendingBanner />, { pendingCount: 0 })
  expect(container).toBeEmptyDOMElement()
})
