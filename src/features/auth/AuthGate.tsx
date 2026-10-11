import type { Session } from '@supabase/supabase-js'
import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../../data/supabase'
import { LoginPage } from './LoginPage'

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => alive && setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [])

  if (session === undefined) return <div className="grid min-h-dvh place-items-center text-4xl" aria-label="Chargement">🔥</div>
  if (session === null) return <LoginPage />
  return <>{children}</>
}
