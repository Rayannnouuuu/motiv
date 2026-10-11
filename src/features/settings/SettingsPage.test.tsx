import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { Program } from '../../domain/types'
import { mkSong, pe, program } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { SettingsPage } from './SettingsPage'

const today = '2026-10-15'
const click = (name: string) => userEvent.click(screen.getByRole('button', { name }))

describe('SettingsPage', () => {
  test('créer la séance « Haut » avec « Développé couché » 4×8', async () => {
    const { actions } = renderWithData(<SettingsPage />, { today })
    await userEvent.type(screen.getByLabelText('Nom de la nouvelle séance'), 'Haut')
    await userEvent.type(screen.getByLabelText("Nom de l'exo"), 'Développé couché')
    await click("Ajouter l'exo")
    await click('Créer la séance')
    const saved = vi.mocked(actions.saveProgram).mock.calls[0][0]
    expect(saved).toMatchObject({ name: 'Haut', position: 0, archived: false })
    expect(saved.exercises).toEqual([
      { id: expect.any(String), programId: saved.id, name: 'Développé couché', targetSets: 4, targetReps: 8, position: 0, archived: false },
    ])
  })

  test('↑ / ↓ changent la position des séances et des exos', async () => {
    const a = program({ id: 'a', name: 'Haut', position: 0, exercises: [pe({ id: 'x', programId: 'a', name: 'Dips', position: 0 }), pe({ id: 'y', programId: 'a', name: 'Rowing', position: 1 })] })
    const b = program({ id: 'b', name: 'Bas', position: 1 })
    const { actions } = renderWithData(<SettingsPage />, { today, data: { programs: [a, b] } })

    await click('Descendre Haut')
    const calls = vi.mocked(actions.saveProgram).mock.calls.map((c) => c[0] as Program)
    expect(calls.map((p) => [p.id, p.position])).toEqual([
      ['b', 0],
      ['a', 1],
    ])

    await click('Monter Rowing')
    const last = vi.mocked(actions.saveProgram).mock.calls.at(-1)![0]
    expect(last.exercises.map((e) => [e.id, e.position])).toEqual([
      ['x', 1],
      ['y', 0],
    ])
  })

  test('Supprimer archive et l’élément disparaît', async () => {
    const a = program({ id: 'a', name: 'Haut', exercises: [pe({ id: 'x', programId: 'a', name: 'Dips' })] })
    const { actions, unmount } = renderWithData(<SettingsPage />, { today, data: { programs: [a] } })
    await click('Supprimer Dips')
    const saved = vi.mocked(actions.saveProgram).mock.calls[0][0]
    expect(saved.exercises[0]).toMatchObject({ id: 'x', archived: true })
    await click('Supprimer Haut')
    expect(vi.mocked(actions.saveProgram).mock.calls[1][0]).toMatchObject({ id: 'a', archived: true })

    // Avec les données à jour, la séance archivée n'est plus listée.
    unmount()
    renderWithData(<SettingsPage />, { today, data: { programs: [{ ...a, archived: true }] } })
    expect(screen.queryByLabelText('Nom de la séance · Haut')).not.toBeInTheDocument()
  })

  test('morceaux : renommer et basculer le statut', async () => {
    const s = mkSong({ id: 's1', title: 'Paranoid' })
    const m = mkSong({ id: 's2', title: 'Iron Man', status: 'mastered', masteredOn: '2026-09-01' })
    const { actions } = renderWithData(<SettingsPage />, { today, data: { songs: [s, m] } })

    const title = screen.getByLabelText('Titre · Paranoid')
    await userEvent.clear(title)
    await userEvent.type(title, 'War Pigs')
    await userEvent.tab()
    expect(actions.saveSong).toHaveBeenCalledWith({ ...s, title: 'War Pigs' })

    await userEvent.click(screen.getByLabelText('Maîtrisé · Paranoid'))
    expect(actions.saveSong).toHaveBeenCalledWith({ ...s, status: 'mastered', masteredOn: today })
    await userEvent.click(screen.getByLabelText('Maîtrisé · Iron Man'))
    expect(actions.saveSong).toHaveBeenCalledWith({ ...m, status: 'learning', masteredOn: null })
  })

  test('« Se déconnecter » appelle signOut', async () => {
    const { actions } = renderWithData(<SettingsPage />, { today })
    await click('Se déconnecter')
    expect(actions.signOut).toHaveBeenCalled()
  })

  test('mot de passe : 8 caractères min., puis enregistré', async () => {
    const { actions } = renderWithData(<SettingsPage />, { today })
    const input = screen.getByLabelText(/Mot de passe/)
    await userEvent.type(input, 'court')
    expect(screen.getByRole('button', { name: 'Enregistrer le mot de passe' })).toBeDisabled()
    await userEvent.type(input, '-assez-long')
    await click('Enregistrer le mot de passe')
    expect(actions.setPassword).toHaveBeenCalledWith('court-assez-long')
    expect(await screen.findByText('Mot de passe enregistré ✓')).toBeInTheDocument()
  })

  test('programme tout fait sans séance : créé directement', async () => {
    const { actions } = renderWithData(<SettingsPage />, { today })
    await click('Suivre Haut / Bas')
    const saved = vi.mocked(actions.saveProgram).mock.calls.map((c) => c[0])
    expect(saved.map((p) => p.name)).toEqual(['Haut', 'Bas'])
    expect(saved[0].exercises).toHaveLength(6)
  })

  test('programme tout fait avec séances existantes : confirmation puis remplacement', async () => {
    const old = program({ id: 'old', name: 'Ancienne' })
    const { actions } = renderWithData(<SettingsPage />, { today, data: { programs: [old] } })
    await click('Suivre Push / Pull / Legs')
    expect(actions.saveProgram).not.toHaveBeenCalled()
    await click('Remplacer')
    const saved = vi.mocked(actions.saveProgram).mock.calls.map((c) => c[0])
    expect(saved[0]).toMatchObject({ id: 'old', archived: true })
    expect(saved.slice(1).map((p) => [p.name, p.position])).toEqual([
      ['Push', 1],
      ['Pull', 2],
      ['Legs', 3],
    ])
  })
})
