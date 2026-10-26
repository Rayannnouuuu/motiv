import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { getExercise } from '../../content/exercises'
import { challenge, ex, g } from '../../test/factories'
import { renderWithData } from '../../test/renderWithData'
import { dailyPlan } from '../../domain/dailyPlan'
import { EMPTY_DATA } from '../../domain/types'
import { loadPractice, savePractice, startPractice } from '../practice/practiceSession'
import { ExercisePage } from './ExercisePage'

function Probe() {
  const loc = useLocation()
  return (
    <p>
      at {loc.pathname} {JSON.stringify(loc.state)}
    </p>
  )
}

const renderPage = (id: string, data = {}) =>
  renderWithData(
    <Routes>
      <Route path="/exo/:id" element={<ExercisePage />} />
      <Route path="/jouer/exo/:id" element={<ExercisePage />} />
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
  expect(within(rows[0]).getByRole('link', { name: /Corriger/ })).toHaveAttribute('href', `/log/corriger/${s2.id}`)
  expect(screen.getByText(/objectif : 90 bpm/)).toBeInTheDocument()
})

test('exo inconnu', () => {
  renderPage('ghost-1')
  expect(screen.getByText('Exo inconnu')).toBeInTheDocument()
})

/** Faux AudioContext du navigateur : juste de quoi lancer le métronome. */
class FakeAudioContext {
  currentTime = 0
  state = 'running'
  destination = {}
  resume = vi.fn(async () => {})
  suspend = vi.fn(async () => {})
  close = vi.fn(async () => {})
  createOscillator = vi.fn(() => ({ frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }))
  createGain = vi.fn(() => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  savePractice(null)
})

test('la carte Métronome démarre au tempo du record, juste au-dessus de la tablature', () => {
  renderPage('legato-4', { guitarSessions: [g('2026-10-10', 30, [ex('legato-4', 80)])] })
  const card = screen.getByRole('region', { name: 'Métronome' })
  expect(within(card).getByText('bpm').previousElementSibling).toHaveTextContent('80')
  expect(within(card).getByRole('button', { name: 'Record 80' })).toHaveAttribute('aria-pressed', 'true')
  expect(within(card).getByRole('button', { name: `Cible ${getExercise('legato-4')!.targetBpm}` })).toBeInTheDocument()
  expect(card.nextElementSibling).toContainElement(screen.getByRole('heading', { name: 'Tablature' }))
})

test('sans record, la carte Métronome démarre au tempo de départ de l’exo', () => {
  renderPage('legato-4')
  const card = screen.getByRole('region', { name: 'Métronome' })
  // Même tempo qu'avant la normalisation : 70 % de la cible (84), arrondi pair.
  expect(getExercise('legato-4')!.startBpm).toBe(58)
  expect(within(card).getByText('bpm').previousElementSibling).toHaveTextContent('58')
  expect(within(card).queryByRole('button', { name: /Record/ })).not.toBeInTheDocument()
})

test('« Logger cet exo » sans lecture du métronome : pas de tempo transmis', async () => {
  renderPage('legato-4', { guitarSessions: [g('2026-10-10', 30, [ex('legato-4', 80)])] })
  await userEvent.click(screen.getByRole('button', { name: 'Tempo +' }))
  await userEvent.click(screen.getByRole('button', { name: 'Logger cet exo' }))
  expect(screen.getByText('at /log/guitare {"exerciseId":"legato-4"}')).toBeInTheDocument()
})

test('« Logger cet exo » après lecture : le dernier tempo joué est transmis', async () => {
  vi.stubGlobal('AudioContext', FakeAudioContext)
  renderPage('legato-4', { guitarSessions: [g('2026-10-10', 30, [ex('legato-4', 80)])] })
  await userEvent.click(screen.getByRole('button', { name: 'Lancer le métronome' }))
  await userEvent.click(screen.getByRole('button', { name: 'Tempo +' }))
  await userEvent.click(screen.getByRole('button', { name: 'Terminer' }))
  await userEvent.click(screen.getByRole('button', { name: 'Logger cet exo' }))
  expect(screen.getByText('at /log/guitare {"exerciseId":"legato-4","bpm":81}')).toBeInTheDocument()
})

test('« Logger cet exo » : le tempo le plus rapide joué est transmis, même après être redescendu', async () => {
  vi.stubGlobal('AudioContext', FakeAudioContext)
  renderPage('legato-4', { guitarSessions: [g('2026-10-10', 30, [ex('legato-4', 80)])] })
  await userEvent.click(screen.getByRole('button', { name: 'Lancer le métronome' }))
  await userEvent.click(screen.getByRole('button', { name: 'Tempo +' }))
  await userEvent.click(screen.getByRole('button', { name: 'Tempo +' }))
  await userEvent.click(screen.getByRole('button', { name: 'Tempo −' }))
  await userEvent.click(screen.getByRole('button', { name: 'Terminer' }))
  await userEvent.click(screen.getByRole('button', { name: 'Logger cet exo' }))
  expect(screen.getByText('at /log/guitare {"exerciseId":"legato-4","bpm":82}')).toBeInTheDocument()
})

test('séance en cours : exo k/N et chrono, tempo proposé avec sa raison, « propre » puis exo suivant', async () => {
  savePractice(startPractice(new Date(), 'p'))
  const [first, second] = dailyPlan(EMPTY_DATA, '2026-10-15')
  renderPage(first.id)
  expect(screen.getByText('Exo 1 sur 3')).toBeInTheDocument()
  expect(screen.getByRole('timer', { name: 'Chrono de la séance' })).toBeInTheDocument()
  expect(screen.getByText(`Premier passage : on démarre à ${first.startBpm} bpm.`)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Tempo +5' }))
  await userEvent.click(screen.getByRole('checkbox', { name: `Propre à ${first.startBpm + 5} bpm` }))
  await userEvent.click(screen.getByRole('button', { name: 'Valider · exo suivant' }))
  expect(screen.getByRole('heading', { name: second.title })).toBeInTheDocument()
  expect(screen.getByText('Exo 2 sur 3')).toBeInTheDocument()
  expect(loadPractice()).toMatchObject({ exercises: [first.id], clean: { [first.id]: first.startBpm + 5 } })
})
