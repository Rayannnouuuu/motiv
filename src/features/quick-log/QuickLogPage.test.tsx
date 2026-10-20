import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { expect, test } from 'vitest'
import { pe, program } from '../../test/factories'
import { renderWithData, type RenderWithDataOptions } from '../../test/renderWithData'
import { QuickLogPage } from './QuickLogPage'

function Probe() {
  const loc = useLocation()
  return <p>at {loc.pathname}</p>
}

const renderQuick = (opts: RenderWithDataOptions = {}) =>
  renderWithData(
    <Routes>
      <Route path="/log" element={<QuickLogPage />} />
      <Route path="*" element={<Probe />} />
    </Routes>,
    { route: '/log', ...opts },
  )

const rate = async (flow: string, desire: string) => {
  await userEvent.click(screen.getAllByRole('radio', { name: flow })[0])
  await userEvent.click(screen.getAllByRole('radio', { name: desire })[1])
}

test('guitare en 3 gestes : 30 min aujourd’hui par défaut, deux notes, enregistrer', async () => {
  const { actions } = renderQuick()
  expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  await rate('4', '5')
  await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
  expect(actions.saveGuitarSession).toHaveBeenCalledWith({
    id: expect.any(String),
    day: '2026-10-15',
    durationMin: 30,
    items: [],
    newSongs: [],
    flowRating: 4,
    desireRating: 5,
  })
  expect(await screen.findByText('at /xp')).toBeInTheDocument()
})

test('sport hier : la prochaine séance du programme présélectionnée, 60 min, note libre', async () => {
  const haut = program({ id: 'haut', name: 'Haut', position: 0, exercises: [pe({ programId: 'haut' })] })
  const bas = program({ id: 'bas', name: 'Bas', position: 1, exercises: [pe({ programId: 'bas' })] })
  const { actions } = renderQuick({ data: { programs: [haut, bas] }, route: { pathname: '/log', state: { discipline: 'sport' } } })
  expect(screen.getByLabelText('Durée en minutes')).toHaveValue(60)
  expect(screen.getByLabelText('Séance')).toHaveValue('haut')
  expect(screen.queryByRole('button', { name: /Détailler/ })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Hier' }))
  await userEvent.selectOptions(screen.getByLabelText('Séance'), 'bas')
  await rate('3', '3')
  await userEvent.type(screen.getByRole('textbox', { name: /Note/ }), 'Jambes lourdes')
  await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
  expect(actions.saveSportSession).toHaveBeenCalledWith({
    id: expect.any(String),
    day: '2026-10-14',
    durationMin: 60,
    programId: 'bas',
    sets: [],
    flowRating: 3,
    desireRating: 3,
    note: 'Jambes lourdes',
  })
})

test('guitare : « Détailler » ouvre le log complet', async () => {
  renderQuick()
  await userEvent.click(screen.getByRole('button', { name: 'Détailler (exos, morceaux)' }))
  expect(screen.getByText('at /log/guitare')).toBeInTheDocument()
})
