import type { TabNote } from '../content/exercises'

const STRINGS = [1, 2, 3, 4, 5, 6]
const NAMES = ['e', 'B', 'G', 'D', 'A', 'E']
const ROW = 18
const BEAT = 34
const LEFT = 18
const TOP = 16

/** Tablature statique : 6 cordes (mi aigu en haut), une colonne par temps. h = hammer-on, b = bend, PM = palm mute. */
export function TabView({ pattern }: { pattern: TabNote[] }) {
  if (pattern.length === 0) return null
  const beats = Math.max(4, Math.ceil(Math.max(...pattern.map((n) => n.startBeat + n.duration))))
  const width = LEFT + beats * BEAT + 8
  const height = TOP + 5 * ROW + 12
  const x = (beat: number) => LEFT + beat * BEAT + BEAT / 2
  const y = (string: number) => TOP + (string - 1) * ROW
  const pmBeats = [...new Set(pattern.filter((n) => n.technique === 'palmMute').map((n) => n.startBeat))]

  return (
    <div className="overflow-x-auto rounded-[0.75rem] bg-surface p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-full" style={{ width: Math.max(width, 0) }} role="img" aria-label="Tablature">
        {STRINGS.map((s, i) => (
          <g key={s}>
            <text x={2} y={y(s) + 4} className="fill-muted font-mono text-[10px]">
              {NAMES[i]}
            </text>
            <line x1={LEFT} x2={width - 8} y1={y(s)} y2={y(s)} className="stroke-muted" strokeOpacity={0.5} strokeWidth={1} />
          </g>
        ))}
        {Array.from({ length: beats / 4 + 1 }, (_, i) => (
          <line key={i} x1={LEFT + i * 4 * BEAT} x2={LEFT + i * 4 * BEAT} y1={y(1)} y2={y(6)} className="stroke-muted" strokeWidth={1} />
        ))}
        {pmBeats.map((b) => (
          <text key={b} x={x(b)} y={9} textAnchor="middle" className="fill-muted font-mono text-[8px]">
            PM
          </text>
        ))}
        {pattern.map((n, i) => {
          const label = `${n.technique === 'hammer' ? 'h' : ''}${n.fret}${n.technique === 'bend' ? 'b' : ''}`
          const w = label.length * 6.5 + 4
          return (
            <g key={i} data-note>
              <rect x={x(n.startBeat) - w / 2} y={y(n.string) - 7} width={w} height={14} rx={3} className="fill-surface-2" />
              <text x={x(n.startBeat)} y={y(n.string) + 4} textAnchor="middle" className="fill-ink font-mono text-[11px] font-semibold">
                {label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
