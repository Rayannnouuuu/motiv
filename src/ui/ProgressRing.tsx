import type { ReactNode } from 'react'

export type RingColor = 'accent' | 'guitar' | 'sport'

const STROKE: Record<RingColor, string> = { accent: 'stroke-accent', guitar: 'stroke-guitar', sport: 'stroke-sport' }

/** Cercle qui se remplit (0 → max), contenu libre au centre. */
export function ProgressRing({ value, max, size = 48, stroke = 5, color = 'accent', children, className = '', transitionMs = 700 }: {
  value: number
  max: number
  size?: number
  stroke?: number
  color?: RingColor
  children?: ReactNode
  className?: string
  transitionMs?: number
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, max > 0 ? value / max : 0))
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-surface-2" strokeWidth={stroke} />
        <circle
          data-ring-fill
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className={STROKE[color]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: `stroke-dashoffset ${transitionMs}ms ease-out` }}
        />
      </svg>
      <span className="relative">{children}</span>
    </span>
  )
}
