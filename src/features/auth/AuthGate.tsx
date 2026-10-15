import { isAuthRetryableFetchError, type Session } from '@supabase/supabase-js'
import { useEffect, useState, type ReactNode } from 'react'
import { clearSent } from '../../data/outbox'
import { clearSnapshot } from '../../data/snapshot'
import { supabase } from '../../data/supabase'
import { LoginPage } from './LoginPage'
import { hasStoredSession } from './storedSession'

/**
 * 'offline' : session gardée sur le téléphone mais jeton expiré, impossible à renouveler sans réseau.
 * On entre quand même : les données locales suffisent, et le jeton se renouvelle au retour du réseau.
 */
type AuthState = Session | null | undefined | 'offline'

/** Après ce délai sans réponse, une session gardée sur le téléphone suffit pour entrer. */
const OFFLINE_GRACE_MS = 1500

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthState>(undefined)

  useEffect(() => {
    let alive = true
    // Hors ligne avec un jeton expiré, getSession réessaie le renouvellement pendant ~25 s : on n'attend pas.
    const grace = setTimeout(() => alive && setSession((s) => (s === undefined && hasStoredSession() ? 'offline' : s)), OFFLINE_GRACE_MS)
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
      clearTimeout(grace)
      data.subscription.unsubscribe()
    }
  }, [])

  // Écran de connexion : les données de la session précédente ne doivent plus s'afficher.
  useEffect(() => {
    if (session === null) {
      clearSnapshot()
      clearSent()
    }
  }, [session])

  // Même fond que l'écran d'ouverture : pas d'éclair blanc entre les deux.
  if (session === undefined)
    return (
      <div className="grid min-h-dvh place-items-center bg-[#7e9a67]" aria-label="Chargement">
        <img src={`${import.meta.env.BASE_URL}logo-512.png`} alt="" width={220} height={220} />
      </div>
    )
  if (session === null) return <LoginPage />
  return <>{children}</>
}
