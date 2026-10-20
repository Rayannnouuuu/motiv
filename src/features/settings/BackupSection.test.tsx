import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { g, mkSong } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { BackupSection } from './BackupSection'

const data = { guitarSessions: [{ ...g('2026-10-14', 30), id: 'g1' }], songs: [mkSong({ id: 's1', title: 'Iron Man' })] }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('BackupSection', () => {
  test('télécharge un fichier JSON avec toutes les données quand le partage de fichiers est absent', async () => {
    let blob: Blob | undefined
    vi.stubGlobal('URL', { ...URL, createObjectURL: (b: Blob) => ((blob = b), 'blob:x'), revokeObjectURL: () => {} })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderWithData(<BackupSection />, { data, today: '2026-10-15' })
    await userEvent.click(screen.getByRole('button', { name: 'Exporter mes données' }))
    expect(click).toHaveBeenCalledOnce()
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('motiv-sauvegarde-2026-10-15.json')
    const backup = JSON.parse(await blob!.text())
    expect(backup).toMatchObject({ app: 'motiv', schemaVersion: 0 })
    expect(backup.data.guitarSessions.map((s: { id: string }) => s.id)).toEqual(['g1'])
    expect(backup.data.songs[0].title).toBe('Iron Man')
    expect(Object.keys(backup.data).sort()).toEqual(['bodyMetrics', 'challenges', 'guitarSessions', 'programs', 'songs', 'sportSessions'])
    expect(await screen.findByText('Sauvegarde prête')).toBeInTheDocument()
  })

  test('passe par la feuille de partage quand elle accepte les fichiers', async () => {
    const share = vi.fn(async () => {})
    vi.stubGlobal('navigator', { ...navigator, canShare: () => true, share })
    renderWithData(<BackupSection />, { data })
    await userEvent.click(screen.getByRole('button', { name: 'Exporter mes données' }))
    expect(share).toHaveBeenCalledOnce()
    expect(await screen.findByText('Sauvegarde prête')).toBeInTheDocument()
  })

  test('feuille de partage refermée : rien n’est annoncé', async () => {
    vi.stubGlobal('navigator', { ...navigator, canShare: () => true, share: vi.fn(async () => Promise.reject(new DOMException('x', 'AbortError'))) })
    renderWithData(<BackupSection />, { data })
    await userEvent.click(screen.getByRole('button', { name: 'Exporter mes données' }))
    expect(screen.queryByText('Sauvegarde prête')).not.toBeInTheDocument()
    expect(screen.getByText(/Garde-le dans Fichiers/)).toBeInTheDocument()
  })

  test('sans données à jour du serveur, l’export est désactivé', () => {
    renderWithData(<BackupSection />, { data, fresh: false })
    expect(screen.queryByRole('button', { name: 'Exporter mes données' })).not.toBeInTheDocument()
    expect(screen.getByText(/Il faut le réseau/)).toBeInTheDocument()
  })
})
