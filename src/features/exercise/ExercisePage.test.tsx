import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { expect, test } from 'vitest'
import { getExercise } from '../../content/exercises'
import { ex, g } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { ExercisePage } from './ExercisePage'

function Probe() {
  const loc = useLocation()
  return <p>at {loc.pathname} {JSON.stringify(loc.state)}</p>
}

const renderPage = (id: string, data = {}) =>
  renderWithData(
    <Routes>
      <Route path="/exo/:id" element={<ExercisePage />} />
      <Route path="*" element={<Probe />} />
    </Routes>,
    { route: `/exo/${id}`, data },
  )

test('fiche : description, tempo, record, tablature, conseils, log', async () => {
  const legato = getExercise('legato-4')!
  const { container } = renderPage('legato-4', { guitarSessions: [g('2026-10-10', 30, [ex('legato-4', 80)])] })
  expect(screen.getByRole('heading', { name: 'Legato 4' })).toBeInTheDocument()
  expect(screen.getByText(legato.description)).toBeInTheDocument()
  expect(screen.getByText(`${legato.targetBpm} bpm`)).toBeInTheDocument()
  expect(screen.getByText('80 bpm')).toBeInTheDocument()
  expect(container.querySelectorAll('[data-note]')).toHaveLength(legato.pattern.length)
  expect(screen.getByText('h5')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Conseils' }).nextElementSibling!.querySelectorAll('li').length).toBeGreaterThan(0)
  await userEvent.click(screen.getByRole('button', { name: 'Logger cet exo' }))
  expect(screen.getByText('at /log/guitare {"exerciseId":"legato-4"}')).toBeInTheDocument()
})

test('exo inconnu', () => {
  renderPage('ghost-1')
  expect(screen.getByText('Exo inconnu')).toBeInTheDocument()
})
