import { useState, type FormEvent } from 'react'
import { supabase } from '../../data/supabase'
import { Button } from '../../ui/Button'

const APP_URL = `${location.origin}/motiv/`

/**
 * Appli lancée depuis l'écran d'accueil : le lien de l'email s'ouvrirait dans Safari, qui n'a pas la clé
 * de connexion gardée par l'appli (flux PKCE) ; la connexion échouerait. Seul le mot de passe marche ici.
 */
const standalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches === true || (navigator as Navigator & { standalone?: boolean }).standalone === true

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

  const input = 't-body min-w-0 flex-1 bg-transparent py-1.5 text-right outline-none placeholder:text-faint'

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4">
      <div className="animate-rise flex flex-col items-center gap-3 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-[1.375rem] bg-gradient-to-b from-[#ff8a3d] to-accent text-[2.75rem] shadow-lg" aria-hidden>
          🔥
        </div>
        <h1 className="t-large">Motiv</h1>
        <p className="t-body -mt-2 text-muted">Guitare + sport, le progrès visible chaque jour.</p>
      </div>
      {state === 'sent' ? (
        <p className="animate-rise t-headline rounded-[1rem] bg-surface p-4 text-center">Lien envoyé, ouvre ton email</p>
      ) : (
        <form onSubmit={signIn} className="animate-rise flex flex-col gap-4" style={{ animationDelay: '80ms' }}>
          <div className="rows overflow-hidden rounded-[0.75rem] bg-surface">
            <div className="flex min-h-11 items-center gap-3 px-4 py-1.5">
              <label htmlFor="email" className="t-body w-28 shrink-0">
                Email
              </label>
              <input id="email" type="email" required autoComplete="email" placeholder="toi@exemple.fr" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
            </div>
            <div className="flex min-h-11 items-center gap-3 px-4 py-1.5">
              <label htmlFor="password" className="t-body w-28 shrink-0">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Requis"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={input}
              />
            </div>
          </div>
          <Button type="submit" disabled={state === 'sending' || !email.trim() || !password}>
            Se connecter
          </Button>
          {standalone() ? (
            <p className="t-footnote px-4 text-center text-muted">
              Mot de passe oublié ? Ouvre Motiv dans Safari pour recevoir un lien de connexion, puis choisis un mot de passe dans Réglages.
            </p>
          ) : (
            <Button variant="ghost" disabled={state === 'sending' || !email.trim()} onClick={sendLink}>
              Recevoir un lien par email
            </Button>
          )}
          {error && (
            <p role="alert" className="t-subhead text-center text-danger">
              {error}
            </p>
          )}
        </form>
      )}
    </main>
  )
}
