import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { DbContext } from '../../data/AppDataContext'
import { loadAll } from '../../data/db'
import { data, g } from '../../test/factories'
import { testDb } from '../../test/testDb'
import { WelcomePage } from './WelcomePage'

function mount() {
  const db = testDb()
  render(
    <DbContext.Provider value={db}>
      <WelcomePage />
    </DbContext.Provider>,
  )
  return db
}

test('commencer sans données : la bibliothèque de base, et l’appli démarre', async () => {
  const db = mount()
  expect(screen.queryByRole('button', { name: /Reprendre mes données/ })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Commencer sans données' }))
  await waitFor(async () => expect((await loadAll(db)).meta.initializedAt).not.toBeNull())
  expect(await db.exercises.count()).toBeGreaterThanOrEqual(30)
})

test('données de l’ancienne version sur ce téléphone : reprises après l’aperçu', async () => {
  localStorage.setItem('motiv.snapshot.v1', JSON.stringify({ savedAt: Date.UTC(2026, 9, 19), data: data({ guitarSessions: [g('2026-10-18', 30), g('2026-10-19', 45)] }) }))
  const db = mount()
  await userEvent.click(screen.getByRole('button', { name: 'Reprendre mes données (2 séances)' }))
  expect(await screen.findByRole('heading', { name: 'Avant d’importer' })).toBeInTheDocument()
  expect(await db.sessions.count()).toBe(0)
  await userEvent.click(screen.getByRole('button', { name: 'Importer' }))
  await waitFor(async () => expect(await db.sessions.count()).toBe(2))
  expect(localStorage.getItem('motiv.snapshot.v1')).not.toBeNull()
})
