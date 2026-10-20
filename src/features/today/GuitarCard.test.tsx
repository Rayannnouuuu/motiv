import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { expect, test } from 'vitest'
import { getExercise } from '../../content/exercises'
import { ex, g, mkSong } from '../../test/factories'
import { icon } from '../../test/icon'
import { renderWithData, type RenderWithDataOptions } from '../../test/renderWithData'
import { savePractice, startPractice } from '../practice/practiceSession'
import { GuitarCard } from './GuitarCard'

const today = '2026-10-15'

function Probe() {
  const loc = useLocation()
  return (
    <p>
      at {loc.pathname} {JSON.stringify(loc.state)}
    </p>
  )
}

const renderCard = (opts: RenderWithDataOptions = {}) =>
  renderWithData(
    <Routes>
      <Route path="/" element={<GuitarCard />} />
      <Route path="*" element={<Probe />} />
    </Routes>,
    { today, ...opts },
  )

test('3 exos sur deux lignes sans description, lien vers la fiche', () => {
  renderCard({
    data: { songs: [mkSong({ title: 'Paranoid' }), mkSong({ title: 'Iron Man', status: 'mastered', masteredOn: '2026-10-01' })] },
  })
  const links = screen.getAllByRole('link').filter((l) => l.getAttribute('href')?.startsWith('/exo/'))
  expect(links).toHaveLength(3)
  expect(screen.getByRole('list', { name: 'Minutes de guitare de la semaine' })).toBeInTheDocument()
  const scales = getExercise('scales-1')!
  expect(links[0]).toHaveAttribute('href', '/exo/scales-1')
  expect(within(links[0]).queryByText(scales.description)).not.toBeInTheDocument()
  expect(within(links[0]).getByText(`niv. ${scales.difficulty}`)).toBeInTheDocument()
  // Le tempo du jour (moteur de progression) : sans historique, le tempo de départ de l'exo.
  expect(within(links[0]).getByText(`Aujourd'hui ${scales.startBpm} bpm`)).toBeInTheDocument()
  expect(screen.queryByText(/Iron Man/)).not.toBeInTheDocument()
  // Plus de jauge ni de « x/60 min » : c'est dans le héros de l'accueil.
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
})

test('exo déjà loggé aujourd’hui : coché, record affiché', () => {
  renderCard({ data: { guitarSessions: [g(today, 20, [ex('scales-1', 70)])] } })
  expect(screen.getAllByRole('link').some((l) => icon(l, 'check') && l.textContent?.includes('ton record 70 bpm'))).toBe(true)
})

test('morceaux du jour : un en cours (déjà joué) et un nouveau ; le toucher ouvre le log avec le morceau', async () => {
  const played = g('2026-10-10', 30, [{ kind: 'song', songId: 's1', markedMastered: false }])
  renderCard({ data: { guitarSessions: [played], songs: [mkSong({ id: 's1', title: 'Paranoid' }), mkSong({ id: 's2', title: 'Iron Man' })] } })
  const list = within(screen.getByRole('list', { name: "Morceaux à jouer aujourd'hui" })).getAllByRole('button')
  expect(list).toHaveLength(2)
  expect(list[0]).toHaveTextContent('Paranoid')
  expect(icon(list[0], 'song')).toBeInTheDocument()
  await userEvent.click(list[0])
  expect(screen.getByText('at /log/guitare {"songTitle":"Paranoid"}')).toBeInTheDocument()
})

test('« Logger sans chrono » : avec les minutes qui manquent', async () => {
  renderCard({ data: { guitarSessions: [g(today, 20)] } })
  expect(screen.queryByRole('button', { name: 'Rejouer avec le chrono' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Logger sans chrono' }))
  expect(screen.getByText('at /log/guitare {"durationMin":10}')).toBeInTheDocument()
})

test('objectif atteint : « Logger sans chrono » sans durée, et rejouer avec le chrono', async () => {
  renderCard({ data: { guitarSessions: [g(today, 60)] } })
  await userEvent.click(screen.getByRole('button', { name: 'Logger sans chrono' }))
  expect(screen.getByText('at /log/guitare null')).toBeInTheDocument()
})

test('objectif atteint : « Rejouer avec le chrono » lance le chrono', async () => {
  renderCard({ data: { guitarSessions: [g(today, 60)] } })
  await userEvent.click(screen.getByRole('button', { name: 'Rejouer avec le chrono' }))
  expect(screen.getByText('at /jouer {"autostart":true}')).toBeInTheDocument()
})

test('objectif atteint mais chrono en cours : pas de « Rejouer »', () => {
  savePractice(startPractice(new Date(), 'p'))
  renderCard({ data: { guitarSessions: [g(today, 60)] } })
  expect(screen.queryByRole('button', { name: 'Rejouer avec le chrono' })).not.toBeInTheDocument()
})

test('semaine : minutes par jour, objectif tenu coché', () => {
  renderCard({ data: { guitarSessions: [g('2026-10-12', 60), g('2026-10-13', 25)] } })
  expect(icon(screen.getByRole('listitem', { name: 'L : 60 min' }), 'check')).toBeInTheDocument()
  expect(screen.getByRole('listitem', { name: 'M : 25 min' })).toHaveTextContent('25')
  expect(screen.getByText('1/7 jours à 60 min')).toBeInTheDocument()
})
