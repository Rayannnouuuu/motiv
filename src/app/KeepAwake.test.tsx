import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Link, MemoryRouter } from 'react-router-dom'
import { KeepAwake, shouldKeepAwake } from './KeepAwake'

function fakeWakeLock() {
  const sentinels: { released: boolean; release: ReturnType<typeof vi.fn> }[] = []
  const request = vi.fn(async () => {
    const s = {
      released: false,
      release: vi.fn(async () => {
        s.released = true
      }),
    }
    sentinels.push(s)
    return s
  })
  return { request, sentinels }
}

let lock: ReturnType<typeof fakeWakeLock>
let visibility: DocumentVisibilityState = 'visible'

beforeEach(() => {
  lock = fakeWakeLock()
  visibility = 'visible'
  Object.defineProperty(navigator, 'wakeLock', { value: { request: lock.request }, configurable: true })
  Object.defineProperty(document, 'visibilityState', { get: () => visibility, configurable: true })
})

afterEach(() => {
  delete (navigator as { wakeLock?: unknown }).wakeLock
  delete (document as { visibilityState?: unknown }).visibilityState
})

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <KeepAwake />
      <Link to="/">Accueil</Link>
    </MemoryRouter>,
  )
}

describe('shouldKeepAwake', () => {
  test('séance sport, jouer et fiche exo : oui', () => {
    expect(shouldKeepAwake('/log/sport')).toBe(true)
    expect(shouldKeepAwake('/jouer')).toBe(true)
    expect(shouldKeepAwake('/exo/abc')).toBe(true)
  })

  test('ailleurs : non', () => {
    expect(shouldKeepAwake('/')).toBe(false)
    expect(shouldKeepAwake('/log/guitare')).toBe(false)
    expect(shouldKeepAwake('/reglages')).toBe(false)
    expect(shouldKeepAwake('/exo')).toBe(false)
  })
})

describe('KeepAwake', () => {
  test('/log/sport : demande le verrou d’écran', async () => {
    renderAt('/log/sport')
    await waitFor(() => expect(lock.request).toHaveBeenCalledWith('screen'))
  })

  test('/ : pas de verrou', async () => {
    renderAt('/')
    await act(async () => {})
    expect(lock.request).not.toHaveBeenCalled()
  })

  test('changement de route : le verrou est libéré', async () => {
    renderAt('/log/sport')
    await waitFor(() => expect(lock.sentinels).toHaveLength(1))
    await userEvent.click(screen.getByRole('link', { name: 'Accueil' }))
    await waitFor(() => expect(lock.sentinels[0].release).toHaveBeenCalled())
  })

  test('retour au premier plan : le verrou libéré par iOS est redemandé', async () => {
    renderAt('/exo/x')
    await waitFor(() => expect(lock.sentinels).toHaveLength(1))
    // iOS libère le verrou quand l'appli passe en arrière-plan.
    visibility = 'hidden'
    lock.sentinels[0].released = true
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    expect(lock.request).toHaveBeenCalledTimes(1)
    visibility = 'visible'
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    await waitFor(() => expect(lock.request).toHaveBeenCalledTimes(2))
  })

  test('API absente ou refus : rien ne casse', async () => {
    delete (navigator as { wakeLock?: unknown }).wakeLock
    renderAt('/log/sport')
    Object.defineProperty(navigator, 'wakeLock', { value: { request: vi.fn(async () => Promise.reject(new Error('NotAllowedError'))) }, configurable: true })
    renderAt('/log/sport')
    await act(async () => {})
    expect(screen.getAllByRole('link', { name: 'Accueil' })).toHaveLength(2)
  })
})
