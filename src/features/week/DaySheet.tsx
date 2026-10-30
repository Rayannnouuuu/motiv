import { Icon, type IconName } from '../../design/icons'
import { TONE } from '../../design/tone'
import type { Domain } from '../../domain/types'
import { Group, Row } from '../../ui/List'
import { Sheet } from '../../ui/Sheet'
import { SwitchRow } from '../../ui/Switch'

/** Ce qu'un jour contient : une séance faite (un toucher la corrige) ou prévue (aujourd'hui, un toucher la lance). */
export interface Chip {
  key: string
  tone: Domain
  icon: IconName
  text: string
  done: boolean
  to?: string
  onClick?: () => void
}

/**
 * Le jour, ouvert d'un toucher sur sa ligne (Semaine) : ce qui est fait, ce qui est prévu, noter une séance
 * aujourd'hui ou hier, et la disponibilité d'un jour à venir.
 */
export function DaySheet({
  label,
  items,
  log,
  isToday,
  off,
  onOff,
  onNavigate,
  onClose,
}: {
  label: string
  items: Chip[]
  /** Aujourd'hui ou hier : on peut y noter une séance de guitare (le log ne remonte pas plus loin). */
  log: { day: string; when: string } | null
  isToday: boolean
  /** Disponibilité d'un jour à venir : `null` sans plan marathon (rien à replacer). */
  off: boolean | null
  onOff: (off: boolean) => void
  onNavigate: (to: string, state?: object) => void
  onClose: () => void
}) {
  return (
    <Sheet label={label} onClose={onClose} title={() => <h2 className="t-headline text-center capitalize">{label}</h2>}>
      {(close) => (
        <div className="flex flex-col gap-6">
          <Group header={items.length > 0 ? 'Ce jour-là' : undefined} footer={items.length === 0 ? 'Rien de fait ni de prévu ce jour-là.' : undefined}>
            {items.map((c) => (
              <Row
                key={c.key}
                icon={<Icon name={c.done ? 'check' : c.icon} className={TONE.text[c.tone]} />}
                title={c.text}
                subtitle={c.done ? 'Fait · toucher pour corriger' : isToday && (c.to || c.onClick) ? 'Prévu · toucher pour lancer' : 'Prévu'}
                to={c.to}
                onClick={c.onClick ? () => (close(), c.onClick!()) : undefined}
              />
            ))}
          </Group>
          {log && (
            <Group>
              <Row
                icon={<Icon name="guitar" className="text-guitar" />}
                title="Noter une séance de guitare"
                subtitle={log.when}
                onClick={() => (close(), onNavigate('/log/guitare', { day: log.day }))}
              />
              {isToday && (
                <Row
                  icon={<Icon name="sport" className="text-sport" />}
                  title="Faire une séance de sport"
                  onClick={() => (close(), onNavigate('/log/sport'))}
                />
              )}
            </Group>
          )}
          {off !== null && (
            <Group footer="Un jour indisponible n'a plus de séance prévue : le plan replace tes sorties et ta muscu sur les autres jours.">
              <SwitchRow title="Disponible ce jour-là" checked={!off} onChange={(v) => onOff(!v)} />
            </Group>
          )}
        </div>
      )}
    </Sheet>
  )
}
