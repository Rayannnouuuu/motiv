import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { expect, test } from 'vitest'
import { EMPTY_PROFILE } from '../../domain/model'
import { g } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { TodayPage } from '../today/TodayPage'
import { ReviewPage } from './ReviewPage'

const sunday = '2026-10-25'

test('dimanche : la carte du bilan mène aux 3 questions ; enregistré pour la semaine qui finit', async () => {
  const { actions } = renderWithData(
    <Routes>
      <Route path="/" element={<TodayPage />} />
      <Route path="/bilan" element={<ReviewPage />} />
    </Routes>,
    { today: sunday, data: { guitarSessions: [g('2026-10-20', 30)] } },
  )
  await userEvent.click(screen.getByRole('link', { name: /Bilan de la semaine · 2 min/ }))
  expect(screen.getByText('Guitare 1/5 · Sport 0/3')).toBeInTheDocument()
  await userEvent.type(screen.getByRole('textbox', { name: 'Ce qui a marché' }), 'Le matin')
  await userEvent.type(screen.getByRole('textbox', { name: 'Le focus de la semaine prochaine' }), 'Legato propre')
  await userEvent.click(screen.getByRole('button', { name: 'Enregistrer le bilan' }))
  expect(actions.saveWeeklyReview).toHaveBeenCalledWith({ week: '2026-10-19', worked: 'Le matin', blocked: '', focus: 'Legato propre', at: sunday })
})

test('la semaine suivante : le focus s’affiche sur Aujourd’hui, plus de carte de bilan', () => {
  const reviews = [{ week: '2026-10-19', worked: '', blocked: '', focus: 'Legato propre', at: sunday }]
  renderWithData(<TodayPage />, { today: '2026-10-28', v1: { profile: { ...EMPTY_PROFILE, reviews } } })
  expect(screen.getByText('Legato propre')).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /Bilan de la semaine/ })).not.toBeInTheDocument()
})
