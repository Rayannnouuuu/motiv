import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom ne fait pas défiler : le retour en haut d'écran à chaque navigation devient un no-op silencieux.
window.scrollTo = () => {}

afterEach(() => {
  cleanup()
  localStorage.clear()
})
