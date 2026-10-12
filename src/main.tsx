import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './app/App'
import { AppDataProvider } from './data/AppDataProvider'
import { AuthGate } from './features/auth/AuthGate'
import './index.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })

// Efface la pastille posée par une notification quand l'appli est ouverte ou revient au premier plan.
const clearBadge = () => (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => {})
clearBadge()
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && clearBadge())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/motiv">
        <AuthGate>
          <AppDataProvider>
            <AppRoutes />
          </AppDataProvider>
        </AuthGate>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
