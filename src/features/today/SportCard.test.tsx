import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { pe, program, set, ss } from '../../test/factories'
import { renderWithData, type RenderWithDataOptions } from '../../test/renderWithData'
import { SportCard } from './SportCard'

function Probe() {
  const loc = useLocation()
  return <p>at {loc.pathname} {JSON.stringify(loc.state)}</p>
}

const renderCard = (opts: RenderWithDataOptions) =>
  renderWithData(
    <Routes>
      <Route path="/" element={<SportCard />} />
      <Route path="*" element={<Probe />} />
    </Routes>,
    { today: '2026-10-15', ...opts },
  )

const bench = pe({ id: 'bench', programId: 'haut', name: 'Développé couché', targetSets: 4, targetReps: 8, position: 0 })
const row = pe({ id: 'row', programId: 'haut', name: 'Rowing', targetSets: 3, targetReps: 10, position: 1 })
const haut = program({ id: 'haut', name: 'Haut', exercises: [bench, row] })

describe('SportCard', () => {
  test('jours passés sans sport : couleur à part ; aujourd’hui et la suite restent neutres', () => {
    // Jeudi 15 : séance lundi 12 ; mardi et mercredi sans sport.
    renderCard({ data: { programs: [haut], sportSessions: [ss([], '2026-10-12', 'haut')] } })
    const strip = screen.getByRole('list', { name: 'Séances de la semaine' })
    const dot = (label: string) => within(strip).getByLabelText(label).lastElementChild!
    const missed = within(strip).getAllByLabelText('M : pas de sport')
    expect(missed).toHaveLength(2)
    for (const d of missed) expect(d.lastElementChild).toHaveClass('bg-danger/15')
    expect(dot('J')).toHaveClass('bg-fill')
    expect(dot('L : Haut')).toHaveClass('bg-sport')
  })

  test('charge du jour : ↑ après une séance validée, rien sans historique', () => {
    const validated = [1, 2, 3, 4].map((i) => set(62.5, 8, 'bench', i))
    renderCard({ data: { programs: [haut], sportSessions: [ss(validated, '2026-10-08', 'autre')] } })
    const benchItem = screen.getByText('Développé couché').closest('li')!
    const rowItem = screen.getByText('Rowing').closest('li')!
    expect(benchItem).toHaveTextContent('4×8 · 65 kg↑')
    expect(within(benchItem).getByText('↑')).toHaveClass('text-guitar')
    expect(rowItem.textContent).toBe('Rowing3×10')
  })

  test('charge identique : pas de flèche', () => {
    const missed = [set(80, 8, 'bench', 1), set(80, 6, 'bench', 2)]
    renderCard({ data: { programs: [haut], sportSessions: [ss(missed, '2026-10-12', 'autre')] } })
    expect(screen.getByText('4×8 · 80 kg')).toBeInTheDocument()
    expect(screen.queryByText('↑')).not.toBeInTheDocument()
  })

  test('« Commencer » : bouton secondaire qui lance directement la séance', async () => {
    renderCard({ data: { programs: [haut] } })
    const start = screen.getByRole('button', { name: 'Commencer Haut' })
    expect(start).toHaveClass('bg-accent/12')
    await userEvent.click(start)
    expect(screen.getByText('at /log/sport {"programId":"haut"}')).toBeInTheDocument()
  })
})
