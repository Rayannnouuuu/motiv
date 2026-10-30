import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { renderWithData } from '../../test/renderWithData'
import { ParcoursPage } from './ParcoursPage'

const TODAY = '2026-11-02'
type Saved = { progress: { skills: Record<string, { status: string }> } }
const saved = (actions: { saveGuitarState: unknown }, n: number) => (actions.saveGuitarState as { mock: { calls: [Saved][] } }).mock.calls[n][0]

describe('parcours des accords', () => {
  test('au départ : Mi m en cours avec son diagramme, sa liste à cocher, et tous les blocs listés', () => {
    renderWithData(<ParcoursPage />, { today: TODAY })
    expect(screen.getByRole('heading', { name: 'Forme · Mi m' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Mi m\. Mi grave : à vide/ })).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(4)
    for (const name of ['Accords ouverts', 'Suspendus et ajoutés', 'Accords de 7e', 'Fa simplifié et variantes', 'Power chords', 'Barrés'])
      expect(screen.getByRole('region', { name: new RegExp(`^${name}`) })).toBeInTheDocument()
    expect(screen.getByLabelText('Avancement')).toHaveTextContent('0 / 96')
  })

  test('cocher la forme et noter l’essai : validée, enregistrée, la suivante s’ouvre', async () => {
    const { actions } = renderWithData(<ParcoursPage />, { today: TODAY })
    for (const box of screen.getAllByRole('checkbox')) await userEvent.click(box)
    await userEvent.click(screen.getByRole('button', { name: /^Noter l’essai/ }))
    await waitFor(() => expect(actions.saveGuitarState).toHaveBeenCalledTimes(1))
    expect(saved(actions, 0).progress.skills['chord-Em'].status).toBe('validated')
    expect(await screen.findByRole('heading', { name: 'Forme · La m' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Validé : Forme · Mi m')
  })

  test('forme incomplète : l’essai est noté mais l’étape reste en cours', async () => {
    const { actions } = renderWithData(<ParcoursPage />, { today: TODAY })
    await userEvent.click(screen.getAllByRole('checkbox')[0])
    await userEvent.click(screen.getByRole('button', { name: /^Noter l’essai/ }))
    await waitFor(() => expect(actions.saveGuitarState).toHaveBeenCalledTimes(1))
    expect(saved(actions, 0).progress.skills['chord-Em'].status).toBe('learning')
    expect(screen.getByRole('heading', { name: 'Forme · Mi m' })).toBeInTheDocument()
  })

  test('« je le sais déjà » depuis une étape verrouillée valide tout ce qui précède', async () => {
    const { actions } = renderWithData(<ParcoursPage />, { today: TODAY })
    await userEvent.click(screen.getByRole('button', { name: 'Forme · Ré · verrouillé' }))
    const sheet = await screen.findByRole('dialog', { name: 'Forme · Ré' })
    await userEvent.click(within(sheet).getByRole('button', { name: /Je le sais déjà, jusqu’ici/ }))
    await waitFor(() => expect(actions.saveGuitarState).toHaveBeenCalledTimes(1))
    const skills = saved(actions, 0).progress.skills
    expect(skills['chord-Em'].status).toBe('validated')
    expect(skills['chord-D'].status).toBe('validated')
    expect(skills['chord-G']).toBeUndefined()
  })
})

describe('parcours des gammes', () => {
  const renderScales = () =>
    renderWithData(
      <Routes>
        <Route path="/parcours/:track" element={<ParcoursPage />} />
      </Routes>,
      { today: TODAY, route: '/parcours/gammes' },
    )

  test('la première forme avec son diagramme, ses blocs et l’avancement de la piste', () => {
    renderScales()
    expect(screen.getByRole('heading', { name: 'Gammes', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Forme · Pentatonique mineure de La, position 1' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Pentatonique mineure de La, position 1\. Mi grave : case 5/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Avancement')).toHaveTextContent('0 / 19')
    for (const name of ['Pentatonique mineure de La', 'Autres pentatoniques et blues', 'Gammes majeure et mineure'])
      expect(screen.getByRole('region', { name: new RegExp(`^${name}`) })).toBeInTheDocument()
  })

  test('on passe des gammes aux accords par le sélecteur', async () => {
    renderScales()
    await userEvent.click(screen.getByRole('button', { name: 'Accords' }))
    expect(await screen.findByRole('heading', { name: 'Forme · Mi m' })).toBeInTheDocument()
  })

  test('forme réussie : notée, mais il faut un second jour pour la valider', async () => {
    const { actions } = renderScales()
    for (const box of screen.getAllByRole('checkbox')) await userEvent.click(box)
    await userEvent.click(screen.getByRole('button', { name: /^Noter l’essai/ }))
    await waitFor(() => expect(actions.saveGuitarState).toHaveBeenCalledTimes(1))
    expect(saved(actions, 0).progress.skills['scale-penta-am-1'].status).toBe('learning')
    expect(screen.getByText(/Réussi sur 1 jour sur 2/)).toBeInTheDocument()
  })
})
