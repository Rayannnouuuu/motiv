import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { DbContext } from '../../data/AppDataContext'
import { startEmpty } from '../../data/backup'
import { loadAll, type MotivDb } from '../../data/db'
import { testDb } from '../../test/testDb'
import { StorageNotices } from './StorageNotices'

const mount = (db: MotivDb) =>
  render(
    <DbContext.Provider value={db}>
      <StorageNotices />
    </DbContext.Provider>,
  )

test('jamais sauvegardé : rappel, « Plus tard » le met en pause', async () => {
  const db = testDb()
  await startEmpty(db, '2026-10-20T08:00:00.000Z')
  mount(db)
  expect(await screen.findByText(/pas encore de sauvegarde au nouveau format/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Plus tard' }))
  await waitFor(() => expect(screen.queryByRole('region', { name: 'Sauvegarde' })).not.toBeInTheDocument())
  expect((await loadAll(db)).meta.backupSnoozedUntil).not.toBeNull()
})

test('dans Safari (pas installée) : invitation à installer, refermable', async () => {
  const db = testDb()
  mount(db)
  expect(await screen.findByRole('region', { name: 'Installer MOTIV' })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Compris' }))
  expect(screen.queryByRole('region', { name: 'Installer MOTIV' })).not.toBeInTheDocument()
})
