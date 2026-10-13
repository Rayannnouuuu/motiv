import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import type { BodyMetric } from '../../domain/types'
import { ex, g, pe, program, set, ss } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { ProgressPage } from './ProgressPage'

const today = '2026-10-15'
const tab = (name: string) => userEvent.click(screen.getByRole('tab', { name }))

const metric = (day: string, weightKg: number | null, waistCm: number | null = null): BodyMetric => ({
  id: day,
  day,
  weightKg,
  waistCm,
  chestCm: null,
  armCm: null,
  thighCm: null,
})

describe('ProgressPage', () => {
  test('les 6 onglets', () => {
    renderWithData(<ProgressPage />, { today })
    for (const name of ['Heures guitare', 'Tempo', 'Morceaux maîtrisés', 'Force', 'Poids', 'Mensurations'])
      expect(screen.getByRole('tab', { name })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Charges' })).not.toBeInTheDocument()
  })

  test('compte neuf : pas de plantage, pas de données', () => {
    renderWithData(<ProgressPage />, { today })
    expect(screen.getByText('Pas encore de données')).toBeInTheDocument()
  })

  test('la période change le delta', async () => {
    renderWithData(<ProgressPage />, { today, data: { guitarSessions: [g('2026-06-01', 600), g('2026-10-10', 120)] } })
    expect(screen.getByText('12 h')).toBeInTheDocument()
    expect(screen.getByTestId('delta')).toHaveTextContent('+2 h sur 90 j')
    await userEvent.click(screen.getByRole('button', { name: '365 j' }))
    expect(screen.getByTestId('delta')).toHaveTextContent('+12 h sur 365 j')
    expect(screen.getByText('10 h de guitare')).toBeInTheDocument()
  })

  test('Tempo : seulement les exos loggés, records datés', async () => {
    const sessions = [g('2026-10-01', 30, [ex('legato-4', 90)]), g('2026-10-05', 30, [ex('legato-4', 96), ex('ghost-1', 200)]), g('2026-10-08', 30, [ex('scales-1', null)])]
    renderWithData(<ProgressPage />, { today, data: { guitarSessions: sessions } })
    await tab('Tempo')
    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['Legato 4'])
    expect(screen.getByText('Records')).toBeInTheDocument()
    expect(screen.getAllByText('96 bpm').length).toBeGreaterThan(0)
    expect(screen.getByText('90 bpm')).toBeInTheDocument()
  })

  test('Force : exos avec séries, archivés compris', async () => {
    const archived = pe({ id: 'pe-old', name: 'Dips', archived: true })
    renderWithData(<ProgressPage />, {
      today,
      data: { programs: [program({ exercises: [archived] })], sportSessions: [ss([set(20, 8, 'pe-old')], '2026-10-10')] },
    })
    await tab('Force')
    expect(screen.getByRole('option', { name: 'Dips' })).toBeInTheDocument()
  })

  test('Force : sans séance, message vide', async () => {
    renderWithData(<ProgressPage />, { today })
    await tab('Force')
    expect(screen.getByText('Fais une séance de sport pour voir ta force.')).toBeInTheDocument()
  })

  test('Force au poids du corps : max de reps', async () => {
    const dips = pe({ id: 'pe-dips', name: 'Dips' })
    renderWithData(<ProgressPage />, {
      today,
      data: { programs: [program({ exercises: [dips] })], sportSessions: [ss([set(0, 6, 'pe-dips')], '2026-10-01'), ss([set(0, 8, 'pe-dips')], '2026-10-10')] },
    })
    await tab('Force')
    expect(screen.getByText('Max de reps en une série')).toBeInTheDocument()
    expect(screen.getAllByText('8 reps').length).toBeGreaterThan(0)
    expect(screen.getByTestId('delta')).toHaveTextContent('+2 reps sur 90 j')
  })

  test('Force chargée : 1RM estimé, écart et records détaillés', async () => {
    const bench = pe({ id: 'pe-bench', name: 'Développé couché' })
    renderWithData(<ProgressPage />, {
      today,
      data: {
        programs: [program({ exercises: [bench] })],
        sportSessions: [ss([set(0, 12, 'pe-bench'), set(62.5, 8, 'pe-bench')], '2026-10-01'), ss([set(65, 8, 'pe-bench')], '2026-10-10')],
      },
    })
    await tab('Force')
    expect(screen.getByText('Force estimée (1RM)')).toBeInTheDocument()
    expect(screen.getByText('≈ 82,3 kg')).toBeInTheDocument()
    expect(screen.getByTestId('delta')).toHaveTextContent('+3,1 kg sur 90 j')
    expect(screen.getByText('65 kg × 8 → ≈ 82,3 kg')).toBeInTheDocument()
    expect(screen.getByText('62,5 kg × 8 → ≈ 79,2 kg')).toBeInTheDocument()
    expect(screen.getByText(/Estimation d'Epley/)).toBeInTheDocument()
  })

  test('Poids : « + mesure », Enregistrer désactivé si tout est vide', async () => {
    const { actions } = renderWithData(<ProgressPage />, { today, data: { bodyMetrics: [metric('2026-10-01', 72)] } })
    await tab('Poids')
    expect(screen.getAllByText('72 kg').length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: '+ mesure' }))
    const save = screen.getByRole('button', { name: 'Enregistrer' })
    expect(save).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Taille (cm)'), '81,5')
    expect(save).toBeEnabled()
    await userEvent.click(save)
    expect(actions.saveBodyMetric).toHaveBeenCalledWith({ ...metric(today, null, 81.5), id: expect.any(String) })
  })

  test('Mensurations : choix de la mesure', async () => {
    renderWithData(<ProgressPage />, { today, data: { bodyMetrics: [metric('2026-10-01', null, 82)] } })
    await tab('Mensurations')
    expect(screen.getByRole('combobox', { name: 'Mesure' })).toHaveValue('waistCm')
    expect(screen.getAllByText('82 cm').length).toBeGreaterThan(0)
  })
})
