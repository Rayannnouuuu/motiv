import { useState } from 'react'
import { Icon, type IconName } from '../../design/icons'
import { TONE } from '../../design/tone'
import type { DayItem, PlannedItem } from '../../domain/dayItems'
import type { Day, Domain } from '../../domain/types'
import { Group, Row } from '../../ui/List'
import { Sheet } from '../../ui/Sheet'
import { SwitchRow } from '../../ui/Switch'
import { AddSessionSheet, ItemSheet } from './DayEdit'

/** Ce qu'un jour contient : une séance faite (un toucher la corrige) ou prévue (aujourd'hui, un toucher la lance). */
export interface Chip {
  key: string
  tone: Domain
  icon: IconName
  text: string
  done: boolean
  to?: string
  onClick?: () => void
  /** Séance prévue (du plan ou ajoutée) : on peut la déplacer ou la retirer. */
  item?: DayItem
}

/** Moduler le jour : ajouter, déplacer, retirer des séances. */
export interface DayEdits {
  day: Day
  today: Day
  programs: { id: string; name: string }[]
  onAdd: (day: Day, item: PlannedItem) => void
  onMove: (item: DayItem, to: Day) => void
  onRemove: (item: DayItem) => void
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
  edits,
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
  edits?: DayEdits
  onNavigate: (to: string, state?: object) => void
  onClose: () => void
}) {
  const [sel, setSel] = useState<Chip | null>(null)
  const [adding, setAdding] = useState(false)
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
                to={edits && c.item && !c.done ? undefined : c.to}
                onClick={edits && c.item && !c.done ? () => setSel(c) : c.onClick ? () => (close(), c.onClick!()) : undefined}
              />
            ))}
          </Group>
          {edits && edits.day >= edits.today && (
            <Group>
              <Row icon={<Icon name="plus" className="text-accent" />} title="Ajouter une séance" onClick={() => setAdding(true)} />
            </Group>
          )}
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
          <>
            {sel?.item && edits && (
              <ItemSheet
                title={sel.text}
                day={sel.item.day}
                today={edits.today}
                onStart={sel.item.day === edits.today ? sel.onClick : undefined}
                onMove={(to) => edits.onMove(sel.item!, to)}
                onRemove={() => edits.onRemove(sel.item!)}
                onClose={() => setSel(null)}
              />
            )}
            {adding && edits && (
              <AddSessionSheet label={label} programs={edits.programs} onAdd={(i) => edits.onAdd(edits.day, i)} onClose={() => setAdding(false)} />
            )}
          </>
        </div>
      )}
    </Sheet>
  )
}
