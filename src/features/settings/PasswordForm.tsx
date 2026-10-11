import { useState } from 'react'
import { useActions } from '../../data/AppDataContext'
import { Button } from '../../ui/Button'
import { useRun } from './useRun'

const MIN_LENGTH = 8

/** Définit ou change le mot de passe, pour se reconnecter sans lien par email. */
export function PasswordForm() {
  const { setPassword } = useActions()
  const { busy, error, run } = useRun()
  const [password, setValue] = useState('')
  const [done, setDone] = useState(false)
  const valid = password.length >= MIN_LENGTH

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="new-password" className="text-sm text-muted">
        Mot de passe (pour te reconnecter sans email, {MIN_LENGTH} caractères min.)
      </label>
      <input
        id="new-password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => {
          setValue(e.target.value)
          setDone(false)
        }}
        className="rounded-xl border border-line bg-surface px-3 py-2"
      />
      <Button
        disabled={!valid || busy}
        onClick={() =>
          run(async () => {
            await setPassword(password)
            setValue('')
            setDone(true)
          })
        }
      >
        Enregistrer le mot de passe
      </Button>
      {done && <p className="text-sm text-guitar">Mot de passe enregistré ✓</p>}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
