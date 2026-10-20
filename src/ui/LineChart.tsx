import { useState, type PointerEvent } from 'react'
import { daysBetween, shortDate } from '../domain/date'
import type { Point } from '../domain/series'
import { TONE, type Tone } from '../design/tone'

const W = 320
const PAD = { top: 12, right: 8, bottom: 22, left: 8 }

/**
 * Courbe d'une seule série, en SVG. Axe des x en jours réels, y entre min et max.
 * `highlights` : points mis en avant (records). Survol / toucher : repère + bulle.
 * `tone` : couleur de la discipline mesurée.
 */
export function LineChart({
  points,
  height = 200,
  format = (v: number) => String(v),
  highlights = [],
  tone = 'accent',
}: {
  points: Point[]
  height?: number
  format?: (v: number) => string
  highlights?: Point[]
  tone?: Tone
}) {
  const [hover, setHover] = useState<number | null>(null)

  if (points.length === 0)
    return (
      <div className="flex items-center justify-center rounded-xl bg-surface-2 text-muted" style={{ height }}>
        Pas encore de données
      </div>
    )

  const values = points.map((p) => p.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min -= 1
    max += 1
  }
  const first = points[0].day
  const span = Math.max(1, daysBetween(first, points.at(-1)!.day))
  const plotW = W - PAD.left - PAD.right
  const plotH = height - PAD.top - PAD.bottom
  const x = (p: Point) => (points.length === 1 ? PAD.left + plotW / 2 : PAD.left + (daysBetween(first, p.day) / span) * plotW)
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * plotH

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width === 0) return
    const px = ((e.clientX - rect.left) / rect.width) * W
    let best = 0
    points.forEach((p, i) => {
      if (Math.abs(x(p) - px) < Math.abs(x(points[best]) - px)) best = i
    })
    setHover(best)
  }

  const h = hover !== null ? points[hover] : null
  const hx = h ? x(h) : 0

  return (
    <figure className="relative m-0">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="w-full touch-none overflow-visible"
        role="img"
        aria-label={`Courbe de ${shortDate(first)} à ${shortDate(points.at(-1)!.day)}, de ${format(Math.min(...values))} à ${format(Math.max(...values))}`}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <line x1={PAD.left} x2={W - PAD.right} y1={y(min)} y2={y(min)} className="stroke-line" strokeWidth={1} />
        {points.length > 1 && (
          <polyline
            points={points.map((p) => `${x(p)},${y(p.value)}`).join(' ')}
            fill="none"
            className={TONE.stroke[tone]}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {points.length === 1 && <circle cx={x(points[0])} cy={y(points[0].value)} r={4} className={TONE.fill[tone]} />}
        {highlights.map((p) => (
          <circle key={p.day} data-record cx={x(p)} cy={y(p.value)} r={4} className={`${TONE.fill[tone]} stroke-surface`} strokeWidth={2} />
        ))}
        {h && (
          <g aria-hidden>
            <line x1={hx} x2={hx} y1={PAD.top} y2={PAD.top + plotH} className="stroke-muted" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={hx} cy={y(h.value)} r={5} className={`${TONE.fill[tone]} stroke-surface`} strokeWidth={2} />
          </g>
        )}
        <text x={PAD.left} y={height - 4} className="fill-muted text-[10px]">
          {shortDate(first)}
        </text>
        {points.length > 1 && (
          <text x={W - PAD.right} y={height - 4} textAnchor="end" className="fill-muted text-[10px]">
            {shortDate(points.at(-1)!.day)}
          </text>
        )}
      </svg>
      {h && (
        <div
          className="t-caption pointer-events-none absolute top-0 -translate-x-1/2 rounded-sm border border-line bg-surface px-2 py-1 whitespace-nowrap shadow-card"
          style={{ left: `${Math.min(85, Math.max(15, (hx / W) * 100))}%` }}
        >
          <span className="text-muted">{shortDate(h.day)}</span> · <span className="font-semibold tabular-nums">{format(h.value)}</span>
        </div>
      )}
    </figure>
  )
}
