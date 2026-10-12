import { useState } from 'react'
import { useActions } from '../../data/AppDataContext'
import { Chip } from '../../ui/Chip'
import { getTheme, setTheme, type Theme } from '../../ui/theme'
import { Button } from '../../ui/Button'
import { NotificationSettings } from './NotificationSettings'
import { PasswordForm } from './PasswordForm'
import { ProgramEditor } from './ProgramEditor'
import { SongList } from './SongList'
import { useRun } from './useRun'

const THEMES: { id: Theme; label: string }[] = [
  { id: 'light', label: 'Clair' },
  { id: 'dark', label: 'Sombre' },
  { id: 'auto', label: 'Auto' },
]

function ThemePicker() {
  const [theme, set] = useState(getTheme)
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Affichage</h2>
      <div className="flex gap-2">
        {THEMES.map((t) => (
          <Chip
            key={t.id}
            selected={theme === t.id}
            onClick={() => {
              setTheme(t.id)
              set(t.id)
            }}
          >
            {t.label}
          </Chip>
        ))}
      </div>
      <p className="text-xs text-muted">Auto suit le réglage clair/sombre du téléphone.</p>
    </section>
  )
}

export function SettingsPage() {
  const { signOut } = useActions()
  const { busy, error, run } = useRun()
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold">Réglages</h1>
      <ThemePicker />
      <NotificationSettings />
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
