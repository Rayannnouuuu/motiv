import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test } from 'vitest'
import { program } from '../test/factories'
import { renderWithData } from '../test/renderWithData'
import { AppRoutes } from './App'
import { SpaceProvider, type Space } from './space'

const renderApp = (initial?: Space, route = '/') =>
  renderWithData(
    <SpaceProvider initial={initial}>
      <AppRoutes />
    </SpaceProvider>,
    { route, data: { programs: [program({ id: 'a', name: 'Haut' })] } },
  )
const tabs = () =>
  within(screen.getByRole('navigation', { name: 'Navigation principale' }))
    .getAllByRole('link')
    .map((l) => l.textContent)

beforeEach(() => sessionStorage.clear())

describe('écran d’ouverture', () => {
  test('à l’ouverture : un écran noir avec deux boutons, Sport et Guitare, et rien d’autre', () => {
    renderApp()
    const chooser = screen.getByRole('dialog', { name: 'Choisir un espace' })
    expect(chooser).toHaveClass('bg-black')
    expect(within(chooser).getAllByRole('button')).toHaveLength(2)
    expect(within(chooser).getByRole('button', { name: 'Sport', description: 'Course · Muscu' })).toBeInTheDocument()
    expect(within(chooser).getByRole('button', { name: 'Guitare', description: 'Accords · Morceaux' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  test('Sport : on entre dans l’espace Sport, le choix tient jusqu’à la fermeture de l’appli', async () => {
    renderApp()
    await userEvent.click(screen.getByRole('button', { name: 'Sport' }))
    expect(screen.queryByRole('dialog', { name: 'Choisir un espace' })).not.toBeInTheDocument()
    expect(tabs()).toEqual(["Aujourd'hui", 'Plan', 'Progrès', 'Moi'])
    expect(sessionStorage.getItem('motiv.space.v1')).toBe('sport')
  })

  test('les écrans de saisie ne passent pas par l’écran de choix', () => {
    renderApp(undefined, '/log/guitare')
    expect(screen.queryByRole('dialog', { name: 'Choisir un espace' })).not.toBeInTheDocument()
  })
})

describe('deux espaces séparés', () => {
  test('espace Guitare : Parcours à la place de Plan, Aujourd’hui sans la carte Sport', () => {
    renderApp('guitar')
    expect(tabs()).toEqual(["Aujourd'hui", 'Parcours', 'Progrès', 'Moi'])
    expect(screen.getByRole('link', { name: /Parcours accords/ })).toBeInTheDocument()
    expect(screen.queryByText(/Sport ·/)).not.toBeInTheDocument()
    expect(screen.queryByText('Voir la semaine')).not.toBeInTheDocument()
  })

  test('espace Sport : Aujourd’hui sans la guitare', () => {
    renderApp('sport')
    expect(screen.queryByText(/Guitare ·/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Parcours accords/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Sport ·/)).toBeInTheDocument()
  })

  test('on passe d’un espace à l’autre en haut à gauche, d’un toucher', async () => {
    renderApp('sport')
    // Le bouton affiche l'espace où l'on est.
    const toGuitar = screen.getByRole('button', { name: "Sport : passer à l'espace Guitare" })
    expect(toGuitar).toHaveTextContent(/^Sport/)
    await userEvent.click(toGuitar)
    expect(tabs()).toEqual(["Aujourd'hui", 'Parcours', 'Progrès', 'Moi'])
    expect(screen.getByRole('button', { name: "Guitare : passer à l'espace Sport" })).toHaveTextContent(/^Guitare/)
    expect(sessionStorage.getItem('motiv.space.v1')).toBe('guitar')
  })

  test('Moi : chaque espace garde ses outils', async () => {
    renderApp('guitar', '/moi')
    await screen.findByRole('heading', { name: 'Moi', level: 1 })
    const links = async () => (await screen.findAllByRole('link')).map((l) => l.textContent ?? '')
    const guitar = await links()
    expect(guitar.some((t) => t.startsWith('Morceaux'))).toBe(true)
    expect(guitar.some((t) => t.startsWith('Modèles de séance'))).toBe(false)
    expect(guitar.some((t) => t.startsWith('Courses Strava'))).toBe(false)
  })

  test('Progrès : plus de choix d’univers, les courbes de l’espace seulement', async () => {
    renderApp('sport', '/progres')
    const curves = await screen.findByRole('group', { name: 'Courbe' })
    expect(screen.queryByRole('group', { name: 'Univers' })).not.toBeInTheDocument()
    expect(
      within(curves)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Force', 'Volume', 'Course', 'Corps'])
  })

  test('Commencer : seulement les séances de l’espace', async () => {
    renderApp('guitar')
    await userEvent.click(screen.getByRole('button', { name: /Autre séance ou séance déjà faite/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Commencer' })
    expect(within(sheet).getByText('Guitare')).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: /Séance guidée/ })).toBeInTheDocument()
    expect(within(sheet).queryByText('Sport')).not.toBeInTheDocument()
    expect(within(sheet).queryByRole('button', { name: 'Choisir une séance' })).not.toBeInTheDocument()
  })
})
