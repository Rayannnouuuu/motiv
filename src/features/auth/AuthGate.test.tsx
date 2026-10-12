import { AuthRetryableFetchError, type AuthChangeEvent, type Session } from '@supabase/supabase-js'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { readSnapshot, writeSnapshot } from '../../data/snapshot'
import { EMPTY_DATA } from '../../domain/types'
import { renderWithData } from '../../test/renderWithData'
import { PendingBanner } from '../../ui/PendingBanner'
import { AuthGate } from './AuthGate'

type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn((_cb: AuthCallback) => ({ data: { subscription: { unsubscribe: () => {} } } })),
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

test('jeton expiré hors ligne : l’appli reste ouverte', async () => {
  auth.getSession.mockResolvedValue({ data: { session: null }, error: new AuthRetryableFetchError('Failed to fetch', 0) })
  render(<AuthGate>appli</AuthGate>)
  expect(await screen.findByText('appli')).toBeInTheDocument()
  const emit = auth.onAuthStateChange.mock.calls[0][0]
  // auth-js annonce INITIAL_SESSION à null hors ligne : ignoré, getSession fait foi.
  act(() => emit('INITIAL_SESSION', null))
  expect(screen.getByText('appli')).toBeInTheDocument()
  act(() => emit('SIGNED_OUT', null))
  expect(await screen.findByLabelText('Email')).toBeInTheDocument()
  expect(screen.queryByText('appli')).not.toBeInTheDocument()
})

test('session absente sans erreur : écran de connexion et instantané effacé', async () => {
  writeSnapshot(EMPTY_DATA)
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
  render(<AuthGate>appli</AuthGate>)
  expect(await screen.findByLabelText('Email')).toBeInTheDocument()
  await waitFor(() => expect(readSnapshot()).toBeNull())
})

test('session présente : instantané gardé', async () => {
  writeSnapshot(EMPTY_DATA)
  auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
  render(<AuthGate>appli</AuthGate>)
  expect(await screen.findByText('appli')).toBeInTheDocument()
  expect(readSnapshot()).not.toBeNull()
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

test('PendingBanner hors ligne', () => {
  const { unmount } = renderWithData(<PendingBanner />, { pendingCount: 0, offline: true })
  expect(screen.getByRole('status')).toHaveTextContent('Hors ligne · tout est gardé sur le téléphone')
  unmount()
  renderWithData(<PendingBanner />, { pendingCount: 2, offline: true })
  expect(screen.getByRole('status')).toHaveTextContent("Hors ligne · 2 logs en attente d'envoi")
})
