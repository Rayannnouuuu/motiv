import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { DbContext } from '../../data/AppDataContext'
import { startEmpty } from '../../data/backup'
import type { MotivDb } from '../../data/db'
import { v0Replica } from '../../test/fixtures/v0Replica'
import { testDb } from '../../test/testDb'
import { BackupSection } from './BackupSection'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function mount() {
  const db = testDb()
  // Données créées dans le passé : l'export d'aujourd'hui est forcément plus récent.
  await startEmpty(db, '2026-01-01T08:00:00.000Z')
  render(
    <DbContext.Provider value={db}>
      <BackupSection />
    </DbContext.Provider>,
  )
  return db
}

const file = (content: unknown) => new File([JSON.stringify(content)], 'motiv-sauvegarde-2026-10-19.json', { type: 'application/json' })

describe('BackupSection', () => {
  test('export : fichier téléchargé, puis « À jour »', async () => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:x', revokeObjectURL: () => {} })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await mount()
    expect(await screen.findByText('Jamais')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Exporter mes données' }))
    // L'export relit d'abord la base : le téléchargement part après un aller-retour asynchrone.
    await waitFor(() => expect(click).toHaveBeenCalledOnce())
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toMatch(/^motiv-sauvegarde-\d{4}-\d{2}-\d{2}-\d{4}\.json$/)
    expect(await screen.findByText('À jour')).toBeInTheDocument()
  })

  test('import d’une ancienne sauvegarde : aperçu, confirmation, puis annulation possible', async () => {
    const db = await mount()
    await userEvent.upload(screen.getByLabelText('Fichier de sauvegarde'), file(v0Replica()))
    const dialog = await screen.findByRole('dialog', { name: 'Importer une sauvegarde' })
    expect(dialog).toHaveTextContent('ancienne version, convertie')
    expect(dialog).toHaveTextContent('46 morceaux « à apprendre »')
    expect(dialog).toHaveTextContent('183 cm en tour de taille')
    expect(await db.sessions.count()).toBe(0)
    await userEvent.click(screen.getByRole('button', { name: 'Importer' }))
    await waitFor(async () => expect(await db.sessions.count()).toBe(7))
    await userEvent.click(await screen.findByRole('button', { name: 'Annuler le dernier import' }))
    await userEvent.click(screen.getByRole('button', { name: 'Annuler le dernier import' }))
    await waitFor(async () => expect(await db.sessions.count()).toBe(0))
  })

  test('fichier qui n’est pas une sauvegarde : message, rien d’écrit', async () => {
    const db: MotivDb = await mount()
    await userEvent.upload(screen.getByLabelText('Fichier de sauvegarde'), file({ hello: 'world' }))
    expect(await screen.findByText("Ce fichier n'est pas une sauvegarde MOTIV.")).toBeInTheDocument()
    expect(await db.sessions.count()).toBe(0)
  })
})
