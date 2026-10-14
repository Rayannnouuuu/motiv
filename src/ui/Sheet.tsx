import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { rubberband, SpringValue, VelocityTracker } from './spring'

/**
 * Feuille qui monte du bas. Elle suit le doigt 1:1 (poignée ou contenu tout en haut), résiste si on la
 * pousse vers le haut, et se ferme si on la lance vers le bas ou qu'on la tire au-delà de la moitié.
 * On peut la rattraper pendant qu'elle bouge.
 */
export function Sheet({ label, title, onClose, children }: { label: string; title?: (close: () => void) => ReactNode; onClose: () => void; children: (close: () => void) => ReactNode }) {
  const panel = useRef<HTMLDivElement>(null)
  const scrim = useRef<HTMLDivElement>(null)
  const spring = useRef<SpringValue | null>(null)
  const closing = useRef(false)
  const height = () => panel.current?.offsetHeight ?? 600

  const apply = useCallback((y: number) => {
    if (panel.current) panel.current.style.transform = `translate3d(0, ${y}px, 0)`
    if (scrim.current) scrim.current.style.opacity = String(Math.max(0, Math.min(1, 1 - y / height())))
  }, [])

  const close = useCallback(() => {
    if (closing.current || !spring.current) return
    closing.current = true
    spring.current.to(height(), { damping: 1, response: 0.45 }, onClose)
  }, [onClose])

  // Entrée : part d'en bas, se pose sans rebond.
  useLayoutEffect(() => {
    const s = new SpringValue(height(), apply)
    spring.current = s
    apply(s.value)
    s.to(0, { damping: 1, response: 0.5 })
    return () => s.stop()
  }, [apply])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  // Glisser pour fermer.
  const drag = useRef<{ startY: number; startValue: number; tracking: boolean } | null>(null)
  const tracker = useRef(new VelocityTracker())

  const onPointerDown = (e: React.PointerEvent) => {
    if (closing.current || !spring.current) return
    const scroller = (e.target as HTMLElement).closest('[data-sheet-scroll]')
    if (scroller && scroller.scrollTop > 0) return
    drag.current = { startY: e.clientY, startValue: spring.current.value, tracking: false }
    tracker.current.reset()
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || !spring.current) return
    const dy = e.clientY - d.startY
    // Petite marge avant de décider que c'est un glissement (pas un toucher).
    if (!d.tracking) {
      if (Math.abs(dy) < 8) return
      d.tracking = true
      panel.current?.setPointerCapture(e.pointerId)
    }
    const raw = d.startValue + dy
    tracker.current.add(e.clientY)
    spring.current.set(raw < 0 ? rubberband(raw, height()) : raw, tracker.current.velocity())
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d?.tracking || !spring.current) return
    const v = tracker.current.velocity()
    // Où la feuille irait avec son élan : c'est ça qui décide, pas seulement la position.
    const projected = spring.current.value + v * 0.2
    if (projected > height() * 0.5) {
      closing.current = true
      spring.current.to(height(), { damping: 1, response: 0.3 }, onClose)
    } else spring.current.to(0, { damping: 0.85, response: 0.35 })
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div ref={scrim} className="absolute inset-0 bg-scrim" style={{ opacity: 0 }} onClick={close} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[1.25rem] bg-bg shadow-2xl will-change-transform dark:[--bg:#1c1c1e] dark:[--surface:#2c2c2e] dark:[--surface-2:#3a3a3c]"
        style={{ transform: 'translate3d(0, 100%, 0)' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Zone de prise : la poignée et le titre suivent le doigt. */}
        <div className="touch-none px-4 pb-2">
          <div className="flex justify-center pt-1.5 pb-2" aria-hidden>
            <span className="h-[5px] w-9 rounded-full bg-faint" />
          </div>
          {title?.(close)}
        </div>
        <div data-sheet-scroll className="overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children(close)}
        </div>
      </div>
    </div>
  )
}
