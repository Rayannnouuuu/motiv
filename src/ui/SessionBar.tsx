import { useEffect, useState, type ReactNode } from 'react'
import { Icon } from '../design/icons'
import { TONE } from '../design/tone'
import type { Domain } from '../domain/types'
import { formatClock } from '../features/practice/practiceSession'

/** Chrono de la séance, recalculé chaque seconde (pauses déduites côté guitare et course). */
function Clock({ elapsedMs }: { elapsedMs: (now: Date) => number }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <span role="timer" aria-label="Chrono de la séance" className="t-title2 tabular-nums">
      {formatClock(elapsedMs(now))}
    </span>
  )
}

/**
 * Barre du haut d'une séance en direct, la même pour la guitare et le sport (REFONTE §7) : quitter à gauche,
 * le nom et le bloc en cours au centre, le chrono à droite. Opaque et collée en haut (zone de l'heure comprise).
 */
export function SessionBar({
  name,
  step,
  onQuit,
  quitLabel,
  back = false,
  elapsedMs,
}: {
  name: ReactNode
  step?: string
  onQuit: () => void
  quitLabel: string
  /** Revenir à l'écran de la séance plutôt que la quitter : flèche plutôt que croix. */
  back?: boolean
  elapsedMs?: (now: Date) => number
}) {
  return (
    <div className="sticky top-0 z-10 -mx-5 -mt-[env(safe-area-inset-top)] mb-1 box-content grid grid-cols-[4rem_1fr_4rem] items-center bg-bg px-5 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2">
      <button type="button" aria-label={quitLabel} onClick={onQuit} className="tap-scale flex size-11 items-center justify-center rounded-full bg-surface-2">
        <Icon name={back ? 'chevron' : 'close'} className={back ? 'rotate-180' : ''} />
      </button>
      <div className="flex min-w-0 flex-col items-center text-center">
        <span className="t-subhead max-w-full truncate font-semibold">{name}</span>
        {step && <span className="t-caption text-muted tabular-nums">{step}</span>}
      </div>
      <div className="justify-self-end">{elapsedMs && <Clock elapsedMs={elapsedMs} />}</div>
    </div>
  )
}

/** Segments des blocs d'une séance : un par exo, rempli à mesure qu'il se fait ; l'exo en cours est souligné. */
export function Segments({ tone, parts, current, label }: { tone: Domain; parts: number[]; current?: number; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex gap-1">
      {parts.map((ratio, i) => (
        <div key={i} className={`h-1.5 flex-1 overflow-hidden rounded-full ${i === current ? 'bg-fill-strong' : 'bg-fill'}`}>
          <div className={`h-full rounded-full ${TONE.bg[tone]}`} style={{ width: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%` }} />
        </div>
      ))}
    </div>
  )
}
