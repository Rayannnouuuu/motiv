import { useEffect, useState } from 'react'
import { TONE, type Tone } from '../../design/tone'
import type { LevelKey } from '../../domain/levelUp'
import { Fireworks } from '../../ui/Fireworks'
import { ProgressRing } from '../../ui/ProgressRing'

const LABEL: Record<LevelKey, string> = { global: 'Niveau global', guitar: 'Guitare', sport: 'Sport' }
const COLOR: Record<LevelKey, Tone> = { global: 'accent', guitar: 'guitar', sport: 'sport' }

const FILL_FROM = 0.6
const FILL_MS = 1300

export interface LevelUpInfo {
  key: LevelKey
  from: number
  to: number
  also: { key: LevelKey; to: number }[]
}

/**
 * Plein écran : le grand cercle se remplit, éclate, le niveau passe au suivant, grands feux d'artifice.
 * Phases : fill (remplissage) → done (niveau atteint).
 */
export function LevelUpOverlay({ info, onClose }: { info: LevelUpInfo; onClose: () => void }) {
  const [fill, setFill] = useState(FILL_FROM)
  const [phase, setPhase] = useState<'fill' | 'done'>('fill')

  useEffect(() => {
    const raf = requestAnimationFrame(() => setFill(1))
    const t = window.setTimeout(() => setPhase('done'), FILL_MS + 150)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
  }, [])

  const done = phase === 'done'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Niveau ${info.to} atteint`}
      className="levelup-fade material fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 overflow-hidden px-6 text-center"
    >
      <div
        aria-hidden
        className="levelup-rays pointer-events-none absolute top-1/2 left-1/2 -mt-[60vmax] -ml-[60vmax] h-[120vmax] w-[120vmax] opacity-25"
        style={{ background: `repeating-conic-gradient(var(--${COLOR[info.key]}) 0deg 9deg, transparent 9deg 24deg)`, maskImage: 'radial-gradient(circle, black 0%, transparent 60%)' }}
      />

      <p className="t-footnote relative font-semibold text-muted uppercase">{LABEL[info.key]}</p>

      <div className={`relative rounded-full bg-surface p-3 shadow-raised ${done ? 'levelup-pop' : ''}`}>
        <ProgressRing value={fill} max={1} size={224} stroke={18} color={COLOR[info.key]} transitionMs={FILL_MS}>
          <span className="flex flex-col items-center leading-none">
            <span className="t-footnote text-muted">Niveau</span>
            <span key={done ? 'to' : 'from'} className={`t-display-lg tabular-nums ${done ? 'levelup-pop' : ''}`}>
              {done ? info.to : info.from}
            </span>
          </span>
        </ProgressRing>
      </div>

      {done && (
        <div className="levelup-rise relative flex flex-col items-center gap-2">
          <p className="t-large">Niveau {info.to} !</p>
          {info.also.length > 0 && (
            <p className="t-subhead text-muted">Et aussi : {info.also.map((a) => `${LABEL[a.key]} niveau ${a.to}`).join(' · ')}</p>
          )}
          <button type="button" className={`tap-scale t-headline mt-4 min-h-12.5 rounded-lg px-10 py-3 ${TONE.solid[COLOR[info.key]]}`} onClick={onClose}>
            Continuer
          </button>
        </div>
      )}

      {done && <Fireworks size="big" />}
    </div>
  )
}
