import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from '../design/icons'
import { TONE, type Tone } from '../design/tone'

const HOLD_DELAY_MS = 450
const HOLD_EVERY_MS = 110

/** Appui long = répétition (24 touchers pour monter à 60 kg, c'est trop). Le toucher simple reste un `onClick`. */
function useHold(action: () => void) {
  const timer = useRef<number | undefined>(undefined)
  const repeated = useRef(false)
  const latest = useRef(action)
  latest.current = action
  const stop = () => {
    window.clearTimeout(timer.current)
    window.clearInterval(timer.current)
  }
  useEffect(() => stop, [])
  return {
    onPointerDown: () => {
      repeated.current = false
      stop()
      timer.current = window.setTimeout(() => {
        repeated.current = true
        latest.current()
        timer.current = window.setInterval(() => latest.current(), HOLD_EVERY_MS)
      }, HOLD_DELAY_MS)
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
    onClick: () => {
      if (repeated.current) repeated.current = false
      else action()
    },
  }
}

/** Valeur centrale avec de grands boutons − / + (utilisables en salle, d'une main). */
export function Stepper({
  label,
  onMinus,
  onPlus,
  tone,
  children,
}: {
  label: string
  onMinus: () => void
  onPlus: () => void
  tone: Tone
  children: ReactNode
}) {
  const minus = useHold(onMinus)
  const plus = useHold(onPlus)
  const btn = `tap-scale touch-manipulation select-none flex size-14 shrink-0 items-center justify-center rounded-full bg-fill ${TONE.text[tone]}`
  return (
    <div className="flex items-center gap-3">
      <button type="button" aria-label={`${label} −`} {...minus} className={btn}>
        <Icon name="minus" size="1.4em" />
      </button>
      <div className="min-w-0 flex-1 text-center">
        <p className="t-footnote text-muted">{label}</p>
        {children}
      </div>
      <button type="button" aria-label={`${label} +`} {...plus} className={btn}>
        <Icon name="plus" size="1.4em" />
      </button>
    </div>
  )
}
