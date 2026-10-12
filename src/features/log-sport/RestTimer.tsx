import { useEffect, useRef, useState } from 'react'
import { ProgressRing } from '../../ui/ProgressRing'
import { haptic } from '../../ui/spring'
import { beep } from './beep'
import { restLeft } from './liveSession'

const TICK_MS = 250
/** Le « C'est reparti » reste affiché une minute, puis le minuteur disparaît. */
const LINGER_MS = 60_000
/** Fin vue en direct (page visible, minuteur qui tourne) : au-delà, on revient d'une autre appli et on ne bipe pas. */
const LIVE_END_MS = 2_000

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * Minuteur de repos entre deux séries. Tout se calcule depuis l'horodatage de la série :
 * le temps reste juste après un passage dans une autre appli ou un rechargement.
 */
export function RestTimer({ startedAt, restSec, nextSet, onAdd, onSkip }: {
  startedAt: string | null
  restSec: number
  /** Numéro de la série qui suit le repos. */
  nextSet: number
  onAdd: () => void
  onSkip: () => void
}) {
  const [now, setNow] = useState(() => Date.now())
  const announced = useRef<string | null>(null)

  const start = startedAt ? new Date(startedAt).getTime() : null
  const end = start === null ? null : start + restSec * 1000
  // Juste après une série, l'horloge n'a pas encore battu : on part de l'heure de la série.
  const t = start === null ? now : Math.max(now, start)
  const phase = end === null ? 'none' : t < end ? 'rest' : t < end + LINGER_MS ? 'done' : 'none'

  useEffect(() => {
    if (end === null || startedAt === null) return
    if (phase === 'rest') {
      const id = window.setInterval(() => {
        const at = Date.now()
        setNow(at)
        if (at >= end && announced.current !== startedAt) {
          announced.current = startedAt
          if (document.visibilityState === 'visible' && at - end < LIVE_END_MS) {
            beep()
            haptic('success')
          }
        }
      }, TICK_MS)
      return () => window.clearInterval(id)
    }
    if (phase === 'done') {
      const id = window.setTimeout(() => setNow(Date.now()), Math.max(0, end + LINGER_MS - Date.now()))
      return () => window.clearTimeout(id)
    }
  }, [phase, end, startedAt])

  if (phase === 'none' || end === null) return null
  const left = restLeft({ restStartedAt: startedAt, restSec }, new Date(t)) ?? 0
  const over = phase === 'done'

  return (
    <section role="timer" aria-label="Repos" className="animate-rise flex items-center gap-3.5 rounded-[1rem] bg-surface px-4 py-3 shadow-card">
      <ProgressRing value={over ? restSec : left} max={restSec} size={56} stroke={5} color={over ? 'guitar' : 'sport'} transitionMs={300}>
        <span className={`t-subhead font-semibold tabular-nums ${over ? 'text-guitar' : ''}`}>{over ? '✓' : clock(left)}</span>
      </ProgressRing>
      {over ? (
        <p className="t-headline font-semibold text-guitar">C'est reparti : série {nextSet}</p>
      ) : (
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <p className="t-headline">Repos</p>
          <div className="flex gap-1">
            <button type="button" onClick={onAdd} className="tap t-subhead min-h-11 rounded-full px-3 font-semibold text-accent">
              +30 s
            </button>
            <button type="button" onClick={onSkip} className="tap t-subhead min-h-11 rounded-full px-3 font-semibold text-accent">
              Passer
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
