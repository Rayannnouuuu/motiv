import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { NotificationLinks } from './NotificationLinks'

const sw = new EventTarget()
beforeEach(() => Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true }))
afterEach(() => {
  Reflect.deleteProperty(navigator, 'serviceWorker')
  window.history.replaceState(null, '', '/')
})

function Where() {
  return <p>at {useLocation().pathname}</p>
}

const renderAt = (path: string) => {
  // shouldReloadNow lit window.location (chemin réel de l'appli, avec /motiv).
  window.history.replaceState(null, '', `/motiv${path}`)
  render(
    <MemoryRouter initialEntries={[path]}>
      <NotificationLinks />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
}
const message = (url: string) => act(() => void sw.dispatchEvent(new MessageEvent('message', { data: { type: 'motiv:open', url } })))

test('rappel vers l’accueil depuis les Réglages : retour à l’accueil', () => {
  renderAt('/reglages')
  message('https://rayannnouuuu.github.io/motiv/')
  expect(screen.getByText('at /')).toBeInTheDocument()
})

test('rappel touché, appli ouverte sur l’accueil : on va à l’écran du rappel', () => {
  renderAt('/')
  message('https://rayannnouuuu.github.io/motiv/log/guitare')
  expect(screen.getByText('at /log/guitare')).toBeInTheDocument()
})

test('rappel touché pendant une saisie : on reste dessus (rien n’est perdu)', () => {
  renderAt('/log/guitare')
  message('https://rayannnouuuu.github.io/motiv/log/sport')
  expect(screen.getByText('at /log/guitare')).toBeInTheDocument()
})
