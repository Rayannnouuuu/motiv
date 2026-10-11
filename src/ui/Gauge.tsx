import { useEffect, useState } from 'react'

export type GaugeColor = 'accent' | 'guitar' | 'sport'

const FILL: Record<GaugeColor, string> = { accent: 'bg-accent', guitar: 'bg-guitar', sport: 'bg-sport' }

/** Barre de progression. `from` permet d'animer la montée depuis une valeur précédente. */
export function Gauge({ value, max, color = 'accent', label, from, className = 'h-2' }: {
  value: number
  max: number
  color?: GaugeColor
  label: string
  from?: number
  className?: string
}) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, max > 0 ? (v / max) * 100 : 0))}%`
  const [width, setWidth] = useState(pct(from ?? value))
  useEffect(() => {
    const t = requestAnimationFrame(() => setWidth(pct(value)))
    return () => cancelAnimationFrame(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, max])

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={`w-full overflow-hidden rounded-full bg-surface-2 ${className}`}
    >
      <div className={`h-full rounded-full transition-[width] duration-700 ease-out ${FILL[color]}`} style={{ width }} />
    </div>
  )
}
