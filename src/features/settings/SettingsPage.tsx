import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../design/icons'
import { Group, Row } from '../../ui/List'
import { Screen } from '../../ui/Screen'
import { Segmented } from '../../ui/Segmented'
import { getStyle, getTheme, setStyle, setTheme, type Style, type Theme } from '../../design/theme'
import { useActions, useAppData } from '../../data/AppDataContext'
import { SwitchRow } from '../../ui/Switch'
import { BackupSection } from './BackupSection'
import { useRun } from './useRun'

// Version installée (date du build + commit) : on voit d'un coup d'œil si la dernière est arrivée.
const VERSION = `${new Date(__BUILD_DATE__).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${__BUILD_SHA__}`

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
  { value: 'auto', label: 'Auto' },
]

const STYLES: { value: Style; label: string }[] = [
  { value: 'classic', label: 'Classique' },
  { value: 'pixel', label: 'Pixel (essai)' },
]

function ThemePicker() {
  const [theme, set] = useState(getTheme)
  const [style, setStyleState] = useState(getStyle)
  return (
    <Group header="Affichage" footer="Auto suit le réglage clair/sombre du téléphone. Le style Pixel est un essai : il se défait ici.">
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
      <div className="px-4 pb-3">
        <Segmented
          label="Style"
          options={STYLES}
          value={style}
          onChange={(v) => {
            setStyle(v)
            setStyleState(v)
          }}
        />
      </div>
    </Group>
  )
}

function Rituals() {
  const { v1 } = useAppData()
  const { setMorningCheckin } = useActions()
  const { run } = useRun()
  return (
    <Group header="Rituels" footer="Sommeil et énergie en 2 taps le matin. Ils nourrissent les observations de Progrès.">
      <SwitchRow title="Check-in du matin" checked={v1.profile.morningCheckin !== false} onChange={(on) => void run(() => setMorningCheckin(on))} />
    </Group>
  )
}

/** Moi › Sauvegarde et réglages. */
export function SettingsPage() {
  const back = (
    <Link to="/moi" className="hit tap t-body flex items-center text-accent">
      <Icon name="chevron" size="1.4em" className="rotate-180" />
      Moi
    </Link>
  )
  return (
    <Screen title="Réglages" overline="Moi" leading={back}>
      <div className="flex flex-col gap-6 pb-4">
        <BackupSection />
        <ThemePicker />
        <Rituals />
        <Group>
          <Row title="Version" detail={VERSION} />
        </Group>
      </div>
    </Screen>
  )
}
