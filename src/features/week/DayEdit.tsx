import { useState } from 'react'
import { Icon } from '../../design/icons'
import { addDays } from '../../domain/date'
import type { PlannedItem } from '../../domain/dayItems'
import { RUN_LABELS, type RunKind } from '../../domain/marathon/plan'
import type { Day } from '../../domain/types'
import { Button } from '../../ui/Button'
import { Group, Row } from '../../ui/List'
import { Sheet } from '../../ui/Sheet'
import { Stepper } from '../../ui/Stepper'
import { dayLabel } from '../marathon/format'

/** Les sorties qu'on peut ajouter, avec une distance de départ. */
const RUNS: { kind: RunKind; km: number }[] = [
  { kind: 'easy', km: 8 },
  { kind: 'long', km: 15 },
  { kind: 'recovery', km: 5 },
  { kind: 'threshold', km: 8 },
  { kind: 'intervals', km: 8 },
]

const kmText = (k: number) => `${String(k).replace('.', ',')} km`

/** Ajouter une séance à un jour : muscu (un de tes modèles), course (type et distance) ou guitare. */
export function AddSessionSheet({
  label,
  programs,
  onAdd,
  onClose,
}: {
  label: string
  programs: { id: string; name: string }[]
  onAdd: (item: PlannedItem) => void
  onClose: () => void
}) {
  const [step, setStep] = useState<'type' | 'strength' | 'run'>('type')
  const [run, setRun] = useState<{ kind: RunKind; km: number } | null>(null)
  return (
    <Sheet label={`Ajouter une séance · ${label}`} onClose={onClose} title={() => <h2 className="t-headline text-center">Ajouter · {label}</h2>}>
      {(close) => {
        const add = (item: PlannedItem) => (onAdd(item), close())
        if (step === 'strength')
          return (
            <div className="flex flex-col gap-4">
              <Group header="Quelle séance ?" footer={programs.length === 0 ? 'Pas encore de modèle : crée-en un dans Moi › Modèles de séance.' : undefined}>
                {programs.map((p) => (
                  <Row
                    key={p.id}
                    icon={<Icon name="muscu" className="text-sport" />}
                    title={p.name}
                    onClick={() => add({ kind: 'strength', programId: p.id, name: p.name })}
                  />
                ))}
              </Group>
              <Button variant="ghost" tone="sport" onClick={() => setStep('type')}>
                Retour
              </Button>
            </div>
          )
        if (step === 'run')
          return run ? (
            <div className="flex flex-col gap-4">
              <p className="t-callout text-center font-semibold">{RUN_LABELS[run.kind]}</p>
              <Stepper
                tone="sport"
                label="Distance"
                onMinus={() => setRun({ ...run, km: Math.max(1, run.km - 1) })}
                onPlus={() => setRun({ ...run, km: Math.min(60, run.km + 1) })}
              >
                <span className="t-large tabular-nums">{kmText(run.km)}</span>
              </Stepper>
              <Button tone="sport" onClick={() => add({ kind: 'run', runKind: run.kind, km: run.km })}>
                Ajouter
              </Button>
              <Button variant="ghost" tone="sport" onClick={() => setRun(null)}>
                Retour
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Group header="Quelle sortie ?">
                {RUNS.map((r) => (
                  <Row
                    key={r.kind}
                    icon={<Icon name="sport" className="text-sport" />}
                    title={RUN_LABELS[r.kind]}
                    detail={kmText(r.km)}
                    onClick={() => setRun(r)}
                  />
                ))}
              </Group>
              <Button variant="ghost" tone="sport" onClick={() => setStep('type')}>
                Retour
              </Button>
            </div>
          )
        return (
          <Group>
            <Row icon={<Icon name="muscu" className="text-sport" />} title="Muscu" subtitle="Un de tes modèles de séance" onClick={() => setStep('strength')} />
            <Row icon={<Icon name="sport" className="text-sport" />} title="Course" subtitle="Type de sortie et distance" onClick={() => setStep('run')} />
            <Row
              icon={<Icon name="guitar" className="text-guitar" />}
              title="Guitare"
              subtitle="Une séance de guitare"
              onClick={() => add({ kind: 'guitar' })}
            />
          </Group>
        )
      }}
    </Sheet>
  )
}

/** « Aujourd'hui », « Demain », puis le jour : où déplacer une séance (les 7 prochains jours, hors son jour actuel). */
const moveTargets = (today: Day, from: Day) =>
  Array.from({ length: 7 }, (_, i) => addDays(today, i))
    .filter((d) => d !== from)
    .map((d) => ({ day: d, label: d === today ? "Aujourd'hui" : d === addDays(today, 1) ? 'Demain' : dayLabel(d) }))

/** Une séance prévue : la lancer (aujourd'hui), la déplacer à un autre jour, ou la retirer de ce jour. */
export function ItemSheet({
  title,
  day,
  today,
  onStart,
  onMove,
  onRemove,
  onClose,
}: {
  title: string
  day: Day
  today: Day
  onStart?: () => void
  onMove: (to: Day) => void
  onRemove: () => void
  onClose: () => void
}) {
  const [moving, setMoving] = useState(false)
  return (
    <Sheet label={title} onClose={onClose} title={() => <h2 className="t-headline truncate text-center">{title}</h2>}>
      {(close) =>
        moving ? (
          <div className="flex flex-col gap-4">
            <Group header="Déplacer à…">
              {moveTargets(today, day).map((t) => (
                <Row key={t.day} title={t.label} onClick={() => (onMove(t.day), close())} />
              ))}
            </Group>
            <Button variant="ghost" onClick={() => setMoving(false)}>
              Retour
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Group>
              {onStart && <Row icon={<Icon name="play" className="text-accent" />} title="Lancer maintenant" onClick={() => (close(), onStart())} />}
              <Row icon={<Icon name="week" className="text-muted" />} title="Déplacer à un autre jour" onClick={() => setMoving(true)} />
              <Row icon={<Icon name="close" className="text-danger" />} title="Retirer de ce jour" onClick={() => (onRemove(), close())} />
            </Group>
          </div>
        )
      }
    </Sheet>
  )
}
