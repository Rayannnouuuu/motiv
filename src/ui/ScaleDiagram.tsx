import type { ScaleShape } from '../content/guitar'

const STRINGS = 6
const X0 = 22
const GAP_X = 16
const Y0 = 34
const GAP_Y = 22

const STRING_NAME = ['', 'Mi aigu', 'Si', 'Sol', 'Ré', 'La', 'Mi grave']

/** Lecture à voix haute, du Mi grave au Mi aigu : les cases et les doigts de chaque corde. */
function describe(s: ScaleShape): string {
  const parts = [6, 5, 4, 3, 2, 1].map((n) => {
    const notes = s.notes.filter((x) => x.string === n).sort((a, b) => a.fret - b.fret)
    return `${STRING_NAME[n]} : ${notes.map((x) => `case ${x.fret}${x.finger ? `, doigt ${x.finger}` : ''}${x.degree === '1' ? ' (fondamentale)' : ''}`).join(' ; ')}`
  })
  return `${s.name}. ${parts.join('. ')}.`
}

/**
 * Diagramme d'une forme de gamme : le Mi grave à gauche, le Mi aigu à droite, les doigts numérotés.
 * Les points entourés sont les fondamentales (les notes de repos). La fenêtre commence à la première case jouée.
 */
export function ScaleDiagram({ shape, size = 'md' }: { shape: ScaleShape; size?: 'sm' | 'md' }) {
  const frets = shape.notes.map((n) => n.fret)
  const baseFret = Math.max(1, Math.min(...frets.filter((f) => f > 0), 99) === 99 ? 1 : Math.min(...frets.filter((f) => f > 0)))
  const hasOpen = frets.includes(0)
  const start = hasOpen ? 1 : baseFret
  const rows = Math.max(4, Math.max(...frets) - start + 1)
  const width = X0 * 2 + GAP_X * (STRINGS - 1)
  const height = Y0 + GAP_Y * rows + 8
  const x = (stringNo: number) => X0 + (STRINGS - stringNo) * GAP_X
  const rowY = (fret: number) => Y0 + (fret - start + 0.5) * GAP_Y
  return (
    <figure className={`flex shrink-0 flex-col items-center gap-1 ${size === 'sm' ? 'w-28' : 'w-44'}`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={describe(shape)} className="w-full text-ink">
        {start === 1 ? (
          <line x1={x(6) - 1} x2={x(1) + 1} y1={Y0} y2={Y0} stroke="currentColor" strokeWidth="4" />
        ) : (
          <text x="2" y={Y0 + GAP_Y * 0.72} className="fill-muted" fontSize="10" fontWeight="600">
            {start}
          </text>
        )}
        {Array.from({ length: rows + 1 }, (_, r) => (
          <line key={r} x1={x(6)} x2={x(1)} y1={Y0 + r * GAP_Y} y2={Y0 + r * GAP_Y} stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
        ))}
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <line key={n} x1={x(n)} x2={x(n)} y1={Y0} y2={Y0 + rows * GAP_Y} stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.2" />
        ))}
        {shape.notes.map((n) => {
          const root = n.degree === '1'
          const cy = n.fret === 0 ? Y0 - 11 : rowY(n.fret)
          return (
            <g key={`${n.string}-${n.fret}`}>
              <circle
                cx={x(n.string)}
                cy={cy}
                r={n.fret === 0 ? 6.5 : 8}
                className="fill-guitar"
                {...(root ? { stroke: 'currentColor', strokeWidth: 2.6 } : {})}
              />
              {n.finger > 0 && (
                <text x={x(n.string)} y={cy + 3.6} textAnchor="middle" fontSize="10.5" fontWeight="700" className="fill-on-guitar">
                  {n.finger}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <figcaption className="t-footnote text-center font-semibold">{shape.name}</figcaption>
    </figure>
  )
}
