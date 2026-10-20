import { useState } from 'react'
import { Group, Row } from '../../ui/List'
import { Screen } from '../../ui/Screen'
import { Segmented } from '../../ui/Segmented'
import { getTheme, setTheme, type Theme } from '../../design/theme'
import { BackupSection } from './BackupSection'

// Version installée (date du build + commit) : on voit d'un coup d'œil si la dernière est arrivée.
const VERSION = `${new Date(__BUILD_DATE__).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${__BUILD_SHA__}`

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
  { value: 'auto', label: 'Auto' },
]

function ThemePicker() {
  const [theme, set] = useState(getTheme)
  return (
    <Group header="Affichage" footer="Auto suit le réglage clair/sombre du téléphone.">
      <div className="px-4 py-3">
        <Segmented
          label="Thème"
          options={THEMES}
          value={theme}
          onChange={(t) => {
            setTheme(t)
            set(t)
          }}
        />
      </div>
    </Group>
  )
}

export function SettingsPage() {
  return (
    <Screen title="Moi">
      <div className="flex flex-col gap-8 pb-4">
        <Group footer="Un plan construit à rebours depuis ta date de course, recalculé chaque lundi.">
          <Row title="Marathon" to="/marathon" />
        </Group>
        <ThemePicker />
        <BackupSection />
        <Group>
          <Row title="Version" detail={VERSION} />
        </Group>
      </div>
    </Screen>
  )
}
