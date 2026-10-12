import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AppRoutes } from './app/App'
import { KeepAwake } from './app/KeepAwake'
import { setupUpdates } from './app/updates'
import { AppDataProvider } from './data/AppDataProvider'
import { AuthGate } from './features/auth/AuthGate'
import './index.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })

// Sur iPhone, :active (retour visuel à l'appui) ne s'applique que si la page écoute les touchers.
document.addEventListener('touchstart', () => {}, { passive: true })

// Efface la pastille posée par une notification quand l'appli est ouverte ou revient au premier plan.
const clearBadge = () => (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => {})
clearBadge()
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && clearBadge())

// Nouvelle version : vérifiée au retour dans l'appli et toutes les heures, rechargée quand rien n'est en cours.
setupUpdates(registerSW)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/motiv">
        <KeepAwake />
        <AuthGate>
          <AppDataProvider>
            <AppRoutes />
          </AppDataProvider>
        </AuthGate>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
