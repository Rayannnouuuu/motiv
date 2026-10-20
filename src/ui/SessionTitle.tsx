import { useEffect, useState, type ReactNode } from 'react'
import { formatClock } from '../features/practice/practiceSession'

/**
 * Titre d'une séance en direct, commun à la guitare et au sport : le nom, puis l'exo en cours et le chrono.
 * `elapsedMs` recalcule le temps à chaque seconde (pauses déduites côté guitare).
 */
export function SessionTitle({ name, step, elapsedMs }: { name: ReactNode; step?: string; elapsedMs: (now: Date) => number }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <span className="flex flex-col items-center leading-tight">
      <span>{name}</span>
      <span className="t-caption font-normal text-muted tabular-nums">
        {step && `${step} · `}
        <span role="timer" aria-label="Chrono de la séance">
          {formatClock(elapsedMs(now))}
        </span>
      </span>
    </span>
  )
}
