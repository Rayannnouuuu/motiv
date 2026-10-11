import { screen, within } from '@testing-library/react'
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
