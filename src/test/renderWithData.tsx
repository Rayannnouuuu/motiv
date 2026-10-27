import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { ActionsContext, AppDataContext, DbContext, type Actions } from '../data/AppDataContext'
import { EMPTY_DATA, type AppData, type Day } from '../domain/types'
import { testDb } from './testDb'
import { migrateV0toV1 } from '../data/migrations/v0ToV1'
import type { DataV1 } from '../domain/model'

/** Le modèle v1 que la base aurait pour ces données (même migration qu'à l'import). */
export const v1Of = (data: AppData) => migrateV0toV1({ app: 'motiv', schemaVersion: 0, exportedAt: '', data }).data

export interface RenderWithDataOptions {
  data?: Partial<AppData>
  /** Parties du modèle v1 que l'ancienne forme ne dit pas (statuts fins des morceaux…). */
  v1?: Partial<DataV1>
  actions?: Partial<Actions>
  today?: Day
  route?: string | { pathname: string; state?: unknown }
}

export function fakeActions(over: Partial<Actions> = {}): Actions {
  return {
    saveGuitarSession: vi.fn(async () => ({ total: 0, lines: [] })),
    saveSportSession: vi.fn(async () => ({ total: 0, lines: [] })),
    saveBodyMetric: vi.fn(async () => {}),
    saveSong: vi.fn(async () => {}),
    setSongStatus: vi.fn(async () => {}),
    saveProgram: vi.fn(async () => {}),
    rerollChallenge: vi.fn(async () => {}),
    startCycle: vi.fn(async () => {}),
    saveCycleReview: vi.fn(async () => {}),
    saveWeeklyReview: vi.fn(async () => {}),
    acceptEasier: vi.fn(async () => {}),
    deleteLog: vi.fn(async () => {}),
    saveMovement: vi.fn(async () => {}),
    saveMarathon: vi.fn(async () => {}),
    saveRun: vi.fn(async () => ({ total: 0, lines: [], chrono: null })),
    setSickWeek: vi.fn(async () => {}),
    setOffDay: vi.fn(async () => {}),
    saveProof: vi.fn(async () => {}),
    deleteProof: vi.fn(async () => {}),
    saveIdea: vi.fn(async () => {}),
    setIdeaStatus: vi.fn(async () => {}),
    saveCheckin: vi.fn(async () => {}),
    setMorningCheckin: vi.fn(async () => {}),
    importRuns: vi.fn(async () => 0),
    saveGuitarState: vi.fn(async () => {}),
    ...over,
  }
}

export function renderWithData(ui: ReactElement, opts: RenderWithDataOptions = {}): RenderResult & { actions: Actions } {
  const actions = fakeActions(opts.actions)
  const data = { ...EMPTY_DATA, ...opts.data }
  const value = { data, v1: { ...v1Of(data), ...opts.v1 }, today: opts.today ?? '2026-10-15' }
  const result = render(
    <MemoryRouter initialEntries={[opts.route ?? '/']}>
      <DbContext.Provider value={testDb()}>
        <AppDataContext.Provider value={value}>
          <ActionsContext.Provider value={actions}>{ui}</ActionsContext.Provider>
        </AppDataContext.Provider>
      </DbContext.Provider>
    </MemoryRouter>,
  )
  return { ...result, actions }
}
