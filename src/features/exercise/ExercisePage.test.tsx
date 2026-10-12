import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { expect, test } from 'vitest'
import { getExercise } from '../../content/exercises'
import { challenge, ex, g } from '../../test/factories'
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
  expect(screen.getByText(`Tempo cible : ${legato.targetBpm} bpm`)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Ton meilleur tempo' }).nextElementSibling).toHaveTextContent('80 bpm')
  expect(container.querySelectorAll('[data-note]')).toHaveLength(legato.pattern.length)
  expect(screen.getByText('h5')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Conseils' }).nextElementSibling!.querySelectorAll('li').length).toBeGreaterThan(0)
  await userEvent.click(screen.getByRole('button', { name: 'Logger cet exo' }))
  expect(screen.getByText('at /log/guitare {"exerciseId":"legato-4"}')).toBeInTheDocument()
})

test('historique des tempos avec lien de correction, défi en cours', () => {
  const s1 = g('2026-10-10', 30, [ex('legato-4', 80)])
  const s2 = g('2026-10-12', 30, [ex('legato-4', 86)])
  const c = challenge({ target: { kind: 'bpm', exerciseId: 'legato-4', bpm: 90, baseline: 86 } })
  renderPage('legato-4', { guitarSessions: [s1, s2], challenges: [c] })
  const rows = within(screen.getByRole('list', { name: 'Historique des tempos' })).getAllByRole('listitem')
  expect(rows.map((r) => r.textContent)).toEqual(['12 oct.86 bpmCorriger', '10 oct.80 bpmCorriger'])
  expect(within(rows[0]).getByRole('link', { name: 'Corriger' })).toHaveAttribute('href', `/log/corriger/${s2.id}`)
  expect(screen.getByText(/défi : 90 bpm/)).toBeInTheDocument()
})

test('exo inconnu', () => {
  renderPage('ghost-1')
  expect(screen.getByText('Exo inconnu')).toBeInTheDocument()
})
