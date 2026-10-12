import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { NotificationSettings } from './NotificationSettings'

const push = vi.hoisted(() => ({
  pushSupport: vi.fn(() => 'ok'),
  currentSubscription: vi.fn(async () => null as unknown),
  enablePush: vi.fn(async () => {}),
  disablePush: vi.fn(async () => {}),
  sendTestPush: vi.fn(async () => {}),
}))
vi.mock('../../data/push', () => push)

beforeEach(() => vi.clearAllMocks())

test('iPhone hors écran d’accueil : explique comment installer', () => {
  push.pushSupport.mockReturnValueOnce('needs-install')
  render(<NotificationSettings />)
  expect(screen.getByText(/Sur l'écran d'accueil/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Activer les notifications' })).not.toBeInTheDocument()
})

test('activer, envoyer un test, désactiver', async () => {
  render(<NotificationSettings />)
  await userEvent.click(await screen.findByRole('button', { name: 'Activer les notifications' }))
  expect(push.enablePush).toHaveBeenCalled()
  expect(await screen.findByText('Notifications activées sur cet appareil ✓')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Envoyer une notification de test' }))
  expect(push.sendTestPush).toHaveBeenCalled()
  expect(await screen.findByText(/elle doit arriver dans quelques secondes/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Désactiver' }))
  expect(push.disablePush).toHaveBeenCalled()
  expect(await screen.findByRole('button', { name: 'Activer les notifications' })).toBeInTheDocument()
})

test('autorisation refusée : message d’erreur', async () => {
  push.enablePush.mockRejectedValueOnce(new Error('Notifications refusées : autorise-les pour Motiv dans les réglages du téléphone.'))
  render(<NotificationSettings />)
  await userEvent.click(await screen.findByRole('button', { name: 'Activer les notifications' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Notifications refusées')
})
