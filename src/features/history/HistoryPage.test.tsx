import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { ex, g, program, pe, set, ss } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { HistoryPage } from './HistoryPage'

describe('HistoryPage', () => {
  const data = {
    programs: [program({ id: 'p1', name: 'Push', exercises: [pe({ id: 'pe1' })] })],
    guitarSessions: [g('2026-09-28', 40, [ex('legato-4', 90)]), g('2026-10-12', 30)],
    sportSessions: [ss([set(60, 8), set(60, 8)], '2026-10-10', 'p1')],
  }

  test('toutes les séances, la plus récente en premier, groupées par mois, chacune ouvre son détail', () => {
    renderWithData(<HistoryPage />, { data })
    expect(screen.getByText('3 séances')).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual([
      expect.stringContaining('Guitare · 30 min'),
      expect.stringContaining('Push'),
      expect.stringContaining('Legato 4'),
    ])
    expect(links[1]).toHaveTextContent('1 exo · 2 séries')
    expect(links[0].getAttribute('href')).toMatch(/^\/log\/corriger\//)
    expect(screen.getByText('Octobre 2026')).toBeInTheDocument()
    expect(screen.getByText('Septembre 2026')).toBeInTheDocument()
  })

  test('filtre par discipline', async () => {
    renderWithData(<HistoryPage />, { data })
    await userEvent.click(screen.getByRole('button', { name: 'Sport' }))
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByText('1 séance')).toBeInTheDocument()
  })

  test('compte neuf', () => {
    renderWithData(<HistoryPage />)
    expect(screen.getByText("Aucune séance pour l'instant.")).toBeInTheDocument()
  })
})
