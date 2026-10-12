import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { mkSong, pe, program } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { SettingsPage } from './SettingsPage'

const today = '2026-10-15'
const click = (name: string | RegExp) => userEvent.click(screen.getByRole('button', { name }))

describe('SettingsPage', () => {
  test('nouvelle séance « Haut » avec « Développé couché » 4×8', async () => {
    const { actions } = renderWithData(<SettingsPage />, { today })
    await click('+ Nouvelle séance')
    await userEvent.type(screen.getByLabelText('Nom de la séance'), 'Haut')
    await click('+ Ajouter un exo')
    await userEvent.type(screen.getByLabelText('Nom · exo 1'), 'Développé couché')
    const sets = screen.getByLabelText('Séries · Développé couché')
    await userEvent.clear(sets)
    await userEvent.type(sets, '4')
    const reps = screen.getByLabelText('Reps · Développé couché')
    await userEvent.clear(reps)
    await userEvent.type(reps, '8')
    await click('Enregistrer')
    const saved = vi.mocked(actions.saveProgram).mock.calls[0][0]
    expect(saved).toMatchObject({ name: 'Haut', position: 0, archived: false })
    expect(saved.exercises).toEqual([
      { id: expect.any(String), programId: saved.id, name: 'Développé couché', targetSets: 4, targetReps: 8, position: 0, archived: false },
    ])
    expect(await screen.findByText('« Haut » enregistrée ✓')).toBeInTheDocument()
  })

  test('modifier : séries et reps modifiables, rien n’est enregistré avant « Enregistrer »', async () => {
    const a = program({ id: 'a', name: 'Haut', exercises: [pe({ id: 'x', programId: 'a', name: 'Dips', targetSets: 3, targetReps: 10 })] })
    const { actions } = renderWithData(<SettingsPage />, { today, data: { programs: [a] } })
    expect(screen.getByText('Dips 3×10')).toBeInTheDocument()
    await click('Modifier Haut')
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
    const sets = screen.getByLabelText('Séries · Dips')
    await userEvent.clear(sets)
    await userEvent.type(sets, '5')
    expect(actions.saveProgram).not.toHaveBeenCalled()
    await click('Enregistrer')
    expect(vi.mocked(actions.saveProgram).mock.calls[0][0].exercises[0]).toMatchObject({ id: 'x', targetSets: 5, targetReps: 10 })
  })

  test('« Annuler » abandonne les changements', async () => {
    const a = program({ id: 'a', name: 'Haut' })
    const { actions } = renderWithData(<SettingsPage />, { today, data: { programs: [a] } })
    await click('Modifier Haut')
    await userEvent.type(screen.getByLabelText('Nom de la séance'), ' 2')
    await click('Annuler')
    expect(actions.saveProgram).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByLabelText('Nom de la séance')).not.toBeInTheDocument())
  })

  test('↑ / ↓ : ordre des séances et des exos', async () => {
    const a = program({ id: 'a', name: 'Haut', position: 0, exercises: [pe({ id: 'x', programId: 'a', name: 'Dips', position: 0 }), pe({ id: 'y', programId: 'a', name: 'Rowing', position: 1 })] })
    const b = program({ id: 'b', name: 'Bas', position: 1 })
    const { actions } = renderWithData(<SettingsPage />, { today, data: { programs: [a, b] } })

    await click('Descendre Haut')
    expect(vi.mocked(actions.saveProgram).mock.calls.map((c) => [c[0].id, c[0].position])).toEqual([
      ['b', 0],
      ['a', 1],
    ])

    await click('Modifier Haut')
    await click('Monter Rowing')
    await click('Enregistrer')
    const last = vi.mocked(actions.saveProgram).mock.calls.at(-1)![0]
    expect(last.exercises.map((e) => [e.id, e.position])).toEqual([
      ['x', 1],
      ['y', 0],
    ])
  })

  test('retirer un exo l’archive ; supprimer la séance l’archive après confirmation', async () => {
    const a = program({ id: 'a', name: 'Haut', exercises: [pe({ id: 'x', programId: 'a', name: 'Dips' })] })
    const { actions } = renderWithData(<SettingsPage />, { today, data: { programs: [a] } })
    await click('Modifier Haut')
    await click('Retirer Dips')
    await click('Enregistrer')
    expect(vi.mocked(actions.saveProgram).mock.calls[0][0].exercises[0]).toMatchObject({ id: 'x', archived: true })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await click('Modifier Haut')
    await click('Supprimer la séance')
    await click('Supprimer')
    expect(vi.mocked(actions.saveProgram).mock.calls[1][0]).toMatchObject({ id: 'a', archived: true })
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
    await click('Changer pour un programme tout fait')
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

  test('thème : clair par défaut, choix appliqué et mémorisé', async () => {
    localStorage.clear()
    renderWithData(<SettingsPage />, { today })
    expect(screen.getByRole('button', { name: 'Clair' })).toHaveAttribute('aria-pressed', 'true')
    await click('Sombre')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('motiv.theme.v1')).toBe('dark')
    expect(screen.getByRole('button', { name: 'Sombre' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('morceaux à essayer : du plus facile, ajout en un geste, déjà ajoutés exclus', async () => {
    const { actions } = renderWithData(<SettingsPage />, { today, data: { songs: [mkSong({ title: 'Seven Nation Army' })] } })
    expect(screen.getByText('Morceaux à essayer')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ajouter Seven Nation Army' })).not.toBeInTheDocument()
    await click('Ajouter Smoke on the Water')
    expect(actions.saveSong).toHaveBeenCalledWith({ id: expect.any(String), title: 'Smoke on the Water', status: 'learning', masteredOn: null })
    await click(/Voir les \d+ morceaux/)
    expect(screen.getByRole('button', { name: 'Voir moins' })).toBeInTheDocument()
  })
})
