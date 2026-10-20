import { useState } from 'react'
import { useActions } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
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
    <>
      <div className="flex min-h-11 items-center gap-3 px-4">
        <label htmlFor="new-password" className="t-body shrink-0">
          Mot de passe
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          placeholder={`${MIN_LENGTH} caractères min.`}
          aria-describedby="password-hint"
          value={password}
          onChange={(e) => {
            setValue(e.target.value)
            setDone(false)
          }}
          className="t-body min-h-11 min-w-0 flex-1 bg-transparent text-right outline-none placeholder:text-muted"
        />
        <span id="password-hint" className="sr-only">
          Pour te reconnecter sans email, {MIN_LENGTH} caractères min.
        </span>
      </div>
      <button
        type="button"
        disabled={!valid || busy}
        className="tap-row t-body flex min-h-11 w-full items-center px-4 py-2.5 text-left text-accent disabled:text-faint"
        onClick={() =>
          run(async () => {
            await setPassword(password)
            setValue('')
            setDone(true)
          })
        }
      >
        Enregistrer le mot de passe
      </button>
      {(done || error) && (
        <p role={error ? 'alert' : undefined} className={`t-subhead px-4 py-2.5 ${error ? 'text-danger' : ''}`}>
          {error ?? (
            <>
              Mot de passe enregistré <Icon name="check" />
            </>
          )}
        </p>
      )}
    </>
  )
}
