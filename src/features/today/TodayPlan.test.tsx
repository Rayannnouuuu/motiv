import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { getExercise } from '../../content/exercises'
import { ex, g, mkSong } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { TodayPlan } from './TodayPlan'

const today = '2026-10-15'

test('3 exos avec détails, lien vers la fiche ; morceaux en cours par leur nom', () => {
  renderWithData(<TodayPlan />, {
    today,
    data: { songs: [mkSong({ title: 'Paranoid' }), mkSong({ title: 'Iron Man', status: 'mastered', masteredOn: '2026-10-01' })] },
  })
  const links = screen.getAllByRole('link')
  expect(links).toHaveLength(3)
  const scales = getExercise('scales-1')!
  expect(links[0]).toHaveAttribute('href', '/exo/scales-1')
  expect(within(links[0]).getByText(scales.description)).toBeInTheDocument()
  expect(within(links[0]).getByText(`Cible ${scales.targetBpm} bpm`)).toBeInTheDocument()
  expect(within(screen.getByRole('list', { name: 'Morceaux en cours' })).getByText('🎵 Paranoid')).toBeInTheDocument()
  expect(screen.queryByText(/Iron Man/)).not.toBeInTheDocument()
})

test('exo déjà loggé aujourd’hui : coché, record affiché', () => {
  renderWithData(<TodayPlan />, { today, data: { guitarSessions: [g(today, 20, [ex('scales-1', 70)])] } })
  expect(screen.getAllByRole('link').some((l) => l.textContent?.includes('✓') && l.textContent.includes('ton record 70 bpm'))).toBe(true)
})

test('morceau suggéré du jour : ajout en un geste', async () => {
  const { actions } = renderWithData(<TodayPlan />, { today })
  const add = screen.getByRole('button', { name: /^Ajouter / })
  const title = add.getAttribute('aria-label')!.replace('Ajouter ', '')
  expect(screen.getByText('Morceau suggéré')).toBeInTheDocument()
  await userEvent.click(add)
  expect(actions.saveSong).toHaveBeenCalledWith({ id: expect.any(String), title, status: 'learning', masteredOn: null })
})
