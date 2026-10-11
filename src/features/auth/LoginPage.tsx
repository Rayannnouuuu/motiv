import { useState, type FormEvent } from 'react'
import { supabase } from '../../data/supabase'
import { Button } from '../../ui/Button'

const APP_URL = `${location.origin}/motiv/`

const message = (m: string) => (/invalid login credentials/i.test(m) ? 'Email ou mot de passe incorrect' : m)

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function signIn(e: FormEvent) {
    e.preventDefault()
    setState('sending')
    setError(null)
    // En cas de succès, AuthGate reçoit la session et affiche l'appli.
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setError(message(error.message))
    setState('idle')
  }

  async function sendLink() {
    setState('sending')
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: APP_URL, shouldCreateUser: false },
    })
    if (error) {
      setError(message(error.message))
      setState('idle')
    } else setState('sent')
  }

  const input = 'rounded-xl border border-line bg-surface px-4 py-3 text-base'

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
      <div className="text-center">
        <div className="text-6xl" aria-hidden>
          🔥
        </div>
        <h1 className="mt-2 text-3xl font-bold">Motiv</h1>
        <p className="text-muted">Guitare + sport, le progrès visible chaque jour.</p>
      </div>
      {state === 'sent' ? (
        <p className="rounded-2xl bg-surface p-4 text-center font-medium">Lien envoyé, ouvre ton email</p>
      ) : (
        <form onSubmit={signIn} className="flex flex-col gap-3">
          <label htmlFor="email" className="text-sm text-muted">
            Email
          </label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          <label htmlFor="password" className="text-sm text-muted">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
          <Button type="submit" disabled={state === 'sending' || !email.trim() || !password}>
            Se connecter
          </Button>
          <Button variant="ghost" disabled={state === 'sending' || !email.trim()} onClick={sendLink}>
            Recevoir un lien par email
          </Button>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </form>
      )}
    </main>
  )
}
