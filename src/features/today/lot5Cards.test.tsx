import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ex, g } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { Ideas } from '../me/Ideas'
import { SettingsPage } from '../settings/SettingsPage'
import { MorningCheckin } from './MorningCheckin'
import { PlateauCard } from './PlateauCard'

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

describe('carte plateau', () => {
  const stuck = {
    guitarSessions: ['2026-10-01', '2026-10-04', '2026-10-07', '2026-10-10', '2026-10-13'].map((d, i) => g(d, 30, [ex('legato-4', [100, 96, 98, 100, 97][i])])),
  }

  test('trois pistes, et « Plus tard » la cache', async () => {
    renderWithData(<PlateauCard />, { data: stuck })
    expect(screen.getByRole('heading', { name: 'Legato 4 : pas de record depuis 4 séances' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    await userEvent.click(screen.getByRole('button', { name: 'Plus tard' }))
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  test('pas de plateau : rien', () => {
    const { container } = renderWithData(<PlateauCard />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('check-in du matin', () => {
  test('avant midi le jour même : sommeil puis énergie, enregistré au 2e tap', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-15T07:00:00Z'))
    const { actions } = renderWithData(<MorningCheckin />, { today: '2026-10-15' })
    await userEvent.click(screen.getByRole('button', { name: '7 h' }))
    expect(actions.saveCheckin).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: '4' }))
    expect(actions.saveCheckin).toHaveBeenCalledWith({ day: '2026-10-15', sleepHours: 7, energy: 4 })
  })

  test('l’après-midi, désactivé ou déjà fait : rien', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-15T13:00:00Z'))
    const { container } = renderWithData(<MorningCheckin />, { today: '2026-10-15' })
    expect(container).toBeEmptyDOMElement()
  })

  test('« Ne plus proposer » le désactive ; le réglage le rallume', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-15T07:00:00Z'))
    const { actions } = renderWithData(<MorningCheckin />, { today: '2026-10-15' })
    await userEvent.click(screen.getByRole('button', { name: 'Ne plus proposer' }))
    expect(actions.setMorningCheckin).toHaveBeenCalledWith(false)
    vi.useRealTimers()
    const settings = renderWithData(<SettingsPage />)
    await userEvent.click(screen.getByRole('switch', { name: 'Check-in du matin' }))
    expect(settings.actions.setMorningCheckin).toHaveBeenCalledWith(false)
  })
})

describe('parking à idées', () => {
  test('noter une idée en 5 secondes', async () => {
    const { actions } = renderWithData(<Ideas />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Nouvelle idée' }), 'Fingerpicking{Enter}')
    await waitFor(() => expect(actions.saveIdea).toHaveBeenCalledWith('Fingerpicking'))
  })

  test('au bilan de cycle : lancer ou laisser', async () => {
    const ideas = [{ id: 'i1', text: 'Fingerpicking', createdAt: '2026-10-01', status: 'parked' as const }]
    const { actions } = renderWithData(<Ideas review />, { v1: { profile: { key: 'profile', migratedFrom: null, levelsAtMigration: null, ideas } } })
    await userEvent.click(screen.getByRole('button', { name: 'Lancer' }))
    expect(actions.setIdeaStatus).toHaveBeenCalledWith('i1', 'promoted')
  })

  test('au bilan, sans idée en attente : rien', () => {
    const { container } = renderWithData(<Ideas review />)
    expect(container).toBeEmptyDOMElement()
  })
})
