import { isAuthRetryableFetchError, type Session } from '@supabase/supabase-js'
import { useEffect, useState, type ReactNode } from 'react'
import { clearSnapshot } from '../../data/snapshot'
import { supabase } from '../../data/supabase'
import { LoginPage } from './LoginPage'

/**
 * 'offline' : session gardée sur le téléphone mais jeton expiré, impossible à renouveler sans réseau.
 * On entre quand même : les données locales suffisent, et le jeton se renouvelle au retour du réseau.
 */
type AuthState = Session | null | undefined | 'offline'

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthState>(undefined)

  useEffect(() => {
    let alive = true
    supabase.auth
      .getSession()
      .then(({ data, error }) => alive && setSession(data.session ?? (error && isAuthRetryableFetchError(error) ? 'offline' : null)))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      // L'état initial vient de getSession : hors ligne, INITIAL_SESSION arrive à null alors que la session est gardée.
      if (event === 'INITIAL_SESSION') return
      setSession(s)
    })
    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [])

  // Écran de connexion : les données de la session précédente ne doivent plus s'afficher.
  useEffect(() => {
    if (session === null) clearSnapshot()
  }, [session])

  if (session === undefined) return <div className="grid min-h-dvh place-items-center text-4xl" aria-label="Chargement">🔥</div>
  if (session === null) return <LoginPage />
  return <>{children}</>
}
