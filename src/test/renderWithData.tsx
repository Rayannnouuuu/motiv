import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { ActionsContext, AppDataContext, type Actions } from '../data/AppDataContext'
import { EMPTY_DATA, type AppData, type Day } from '../domain/types'

export interface RenderWithDataOptions {
  data?: Partial<AppData>
  actions?: Partial<Actions>
  today?: Day
  pendingCount?: number
  route?: string | { pathname: string; state?: unknown }
}

export function fakeActions(over: Partial<Actions> = {}): Actions {
  return {
    saveGuitarSession: vi.fn(async () => ({ total: 0, lines: [] })),
    saveSportSession: vi.fn(async () => ({ total: 0, lines: [] })),
    saveBodyMetric: vi.fn(async () => {}),
    saveSong: vi.fn(async () => {}),
    saveProgram: vi.fn(async () => {}),
    rerollChallenge: vi.fn(async () => {}),
    acceptEasier: vi.fn(async () => {}),
    deleteLog: vi.fn(async () => {}),
    setPassword: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    ...over,
  }
}

export function renderWithData(ui: ReactElement, opts: RenderWithDataOptions = {}): RenderResult & { actions: Actions } {
  const actions = fakeActions(opts.actions)
  const value = {
    data: { ...EMPTY_DATA, ...opts.data },
    pendingCount: opts.pendingCount ?? 0,
    today: opts.today ?? '2026-10-15',
    loading: false,
    error: null,
  }
  const result = render(
    <MemoryRouter initialEntries={[opts.route ?? '/']}>
      <AppDataContext.Provider value={value}>
        <ActionsContext.Provider value={actions}>{ui}</ActionsContext.Provider>
      </AppDataContext.Provider>
    </MemoryRouter>,
  )
  return { ...result, actions }
}
