import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Proof } from '../../domain/model'
import { EMPTY_DATA } from '../../domain/types'
import { ex, g, mkSong } from '../../test/factories'
import { renderWithData, v1Of } from '../../test/renderWithData'
import { ProofsPage } from './ProofsPage'

const audio = (id: string, day: string): Proof => ({
  id,
  discipline: 'guitar',
  kind: 'audio',
  day,
  createdAt: `${day}T10:00:00Z`,
  mime: 'audio/mp4',
  exerciseId: 'legato-4',
  durationSec: 65,
})
const photo = (id: string, day: string): Proof => ({ id, discipline: 'sport', kind: 'photo', day, createdAt: `${day}T10:00:00Z`, mime: 'image/jpeg' })
const data = {
  guitarSessions: [g('2026-10-01', 30, [ex('legato-4', 90)])],
  songs: [mkSong({ id: 's1', title: 'Wonderwall', status: 'mastered', masteredOn: '2026-09-01' })],
}
const withProofs = (proofs: Proof[]) => {
  const v1 = v1Of({ ...EMPTY_DATA, ...data })
  return { ...v1, profile: { ...v1.profile, proofs } }
}

beforeEach(() => {
  vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:x', revokeObjectURL: () => {} })
})
afterEach(() => vi.unstubAllGlobals())

describe('ProofsPage', () => {
  test('rien encore : une phrase par section, enregistrement indisponible sans micro', () => {
    renderWithData(<ProofsPage />, { data })
    expect(screen.getByText("Enregistre-toi aujourd'hui : dans 30 jours, tu compareras.")).toBeInTheDocument()
    expect(screen.getByText(/Une photo aujourd'hui/)).toBeInTheDocument()
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Wonderwall', 'Legato 4'])
    expect(screen.getByText("L'enregistrement n'est pas disponible sur ce navigateur.")).toBeInTheDocument()
  })

  test('il y a un mois / dernière : le sujet enregistré passe en premier', () => {
    const proofs = [audio('a', '2026-09-10'), audio('b', '2026-10-15'), photo('p1', '2026-09-01'), photo('p2', '2026-10-14')]
    renderWithData(<ProofsPage />, { data, v1: { profile: withProofs(proofs).profile } })
    expect(screen.getByRole('combobox', { name: 'Morceau ou exo' })).toHaveValue('exercise:legato-4')
    expect(screen.getByText('35 jours avant')).toBeInTheDocument()
    expect(screen.getByText('43 jours avant')).toBeInTheDocument()
    expect(screen.getAllByText('Dernière')).toHaveLength(2)
    expect(screen.getAllByText('Tout voir (2)')).toHaveLength(2)
  })

  test('une seule photo : la prochaine est conseillée dans 30 jours', () => {
    renderWithData(<ProofsPage />, { data, v1: { profile: withProofs([photo('p1', '2026-10-14')]).profile } })
    expect(screen.getByText(/Prochaine photo conseillée le .*13 novembre/)).toBeInTheDocument()
  })

  test('photo choisie : enregistrée comme preuve sport du jour', async () => {
    const { actions } = renderWithData(<ProofsPage />, { data })
    await userEvent.upload(screen.getByLabelText('Photo de progression'), new File([new Uint8Array([1, 2])], 'x.jpg', { type: 'image/jpeg' }))
    await waitFor(() =>
      expect(actions.saveProof).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'photo', discipline: 'sport', day: '2026-10-15', mime: 'image/jpeg' }),
        expect.anything(),
      ),
    )
  })
})
