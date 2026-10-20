import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AppRoutes } from './app/App'
import { KeepAwake } from './app/KeepAwake'
import { setupUpdates } from './app/updates'
import { AppDataProvider } from './data/AppDataProvider'
import { createDb } from './data/db'
import { WelcomePage } from './features/backup/WelcomePage'
import './index.css'
import { Splash } from './ui/Splash'
import { followSystemTheme } from './design/theme'

// Sur iPhone, :active (retour visuel à l'appui) ne s'applique que si la page écoute les touchers.
document.addEventListener('touchstart', () => {}, { passive: true })

followSystemTheme()

// Nouvelle version : vérifiée au retour dans l'appli et toutes les heures, rechargée quand rien n'est en cours.
setupUpdates(registerSW)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* « /motiv » ou « /motiv/essai » : la version d'essai vit sous l'appli principale. */}
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Splash />
      <KeepAwake />
      <AppDataProvider db={createDb()} welcome={<WelcomePage />}>
        <AppRoutes />
      </AppDataProvider>
    </BrowserRouter>
  </StrictMode>,
)
