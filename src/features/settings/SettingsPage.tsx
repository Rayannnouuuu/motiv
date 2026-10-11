import { useActions } from '../../data/AppDataContext'
import { Button } from '../../ui/Button'
import { PasswordForm } from './PasswordForm'
import { ProgramEditor } from './ProgramEditor'
import { SongList } from './SongList'
import { useRun } from './useRun'

export function SettingsPage() {
  const { signOut } = useActions()
  const { busy, error, run } = useRun()
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold">Réglages</h1>
      <ProgramEditor />
      <SongList />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Compte</h2>
        <PasswordForm />
        <Button variant="secondary" disabled={busy} onClick={() => run(signOut)}>
          Se déconnecter
        </Button>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </section>
    </div>
  )
}
