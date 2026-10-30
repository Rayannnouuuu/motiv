import type { Chord } from '../content/guitar'

const STRINGS = 6
const ROWS = 5
const X0 = 22
const GAP_X = 16
const Y0 = 34
const GAP_Y = 22

const STRING_NAME = ['Mi grave', 'La', 'Ré', 'Sol', 'Si', 'Mi aigu']

/** Lecture à voix haute du diagramme, corde par corde, du Mi grave au Mi aigu. */
function describe(c: Chord): string {
  const parts = c.frets.map((f, i) =>
    f === 'x'
      ? `${STRING_NAME[i]} : muette`
      : f === 0
        ? `${STRING_NAME[i]} : à vide`
        : `${STRING_NAME[i]} : case ${f}${c.fingers[i] ? `, doigt ${c.fingers[i]}` : ''}`,
  )
  return `${c.name}. ${parts.join('. ')}.${c.baseFret > 1 ? ` Diagramme à partir de la case ${c.baseFret}.` : ''}`
}

/**
 * Diagramme d'accord : le Mi grave à gauche, le Mi aigu à droite, les doigts numérotés (1 index … 4 auriculaire).
 * Les cordes muettes sont marquées d'une croix, les cordes à vide d'un rond. `baseFret` décale la fenêtre.
 */
export function ChordDiagram({ chord, size = 'md' }: { chord: Chord; size?: 'sm' | 'md' }) {
  const width = X0 * 2 + GAP_X * (STRINGS - 1)
  const height = Y0 + GAP_Y * ROWS + 8
  const x = (i: number) => X0 + i * GAP_X
  const rowY = (fret: number) => Y0 + (fret - chord.baseFret + 0.5) * GAP_Y
  return (
    <figure className={`flex shrink-0 flex-col items-center gap-1 ${size === 'sm' ? 'w-28' : 'w-40'}`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={describe(chord)} className="w-full text-ink">
        {/* sillet (en haut du manche) ou repère de case */}
        {chord.baseFret === 1 ? (
          <line x1={x(0) - 1} x2={x(5) + 1} y1={Y0} y2={Y0} stroke="currentColor" strokeWidth="4" />
        ) : (
          <text x="2" y={Y0 + GAP_Y * 0.72} className="fill-muted" fontSize="10" fontWeight="600">
            {chord.baseFret}
          </text>
        )}
        {Array.from({ length: ROWS + 1 }, (_, r) => (
          <line key={r} x1={x(0)} x2={x(5)} y1={Y0 + r * GAP_Y} y2={Y0 + r * GAP_Y} stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
        ))}
        {Array.from({ length: STRINGS }, (_, i) => (
          <line key={i} x1={x(i)} x2={x(i)} y1={Y0} y2={Y0 + ROWS * GAP_Y} stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.2" />
        ))}
        {chord.barre && (
          <rect
            x={x(STRINGS - chord.barre.fromString) - 7}
            width={x(STRINGS - chord.barre.toString) - x(STRINGS - chord.barre.fromString) + 14}
            y={rowY(chord.barre.fret) - 7}
            height="14"
            rx="7"
            className="fill-guitar"
          />
        )}
        {chord.barre && (
          <text
            x={x(STRINGS - chord.barre.fromString)}
            y={rowY(chord.barre.fret) + 3.6}
            textAnchor="middle"
            fontSize="10.5"
            fontWeight="700"
            className="fill-on-guitar"
          >
            1
          </text>
        )}
        {chord.frets.map((f, i) =>
          f === 'x' ? (
            <text key={i} x={x(i)} y={Y0 - 10} textAnchor="middle" fontSize="12" className="fill-muted" fontWeight="700">
              ×
            </text>
          ) : f === 0 ? (
            <circle key={i} cx={x(i)} cy={Y0 - 14} r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          ) : chord.barre && f === chord.barre.fret && STRINGS - i <= chord.barre.fromString && STRINGS - i >= chord.barre.toString ? null : (
            <g key={i}>
              <circle cx={x(i)} cy={rowY(f)} r="8" className="fill-guitar" />
              {chord.fingers[i] > 0 && (
                <text x={x(i)} y={rowY(f) + 3.6} textAnchor="middle" fontSize="10.5" fontWeight="700" className="fill-on-guitar">
                  {chord.fingers[i]}
                </text>
              )}
            </g>
          ),
        )}
      </svg>
      <figcaption className="t-footnote text-center font-semibold">{chord.name}</figcaption>
    </figure>
  )
}
