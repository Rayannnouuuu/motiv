import { useEffect, useState } from 'react'
import type { LevelKey } from '../../domain/levelUp'
import { Fireworks } from '../../ui/Fireworks'
import { ProgressRing, type RingColor } from '../../ui/ProgressRing'

const LABEL: Record<LevelKey, string> = { global: 'Niveau global', guitar: '🎸 Guitare', sport: '🏋️ Sport' }
const COLOR: Record<LevelKey, RingColor> = { global: 'accent', guitar: 'guitar', sport: 'sport' }

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
      className="levelup-fade fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 overflow-hidden bg-bg/95 px-6 text-center backdrop-blur-sm"
    >
      <div
        aria-hidden
        className="levelup-rays pointer-events-none absolute top-1/2 left-1/2 -mt-[60vmax] -ml-[60vmax] h-[120vmax] w-[120vmax] opacity-25"
        style={{ background: 'repeating-conic-gradient(var(--accent) 0deg 9deg, transparent 9deg 24deg)', maskImage: 'radial-gradient(circle, black 0%, transparent 60%)' }}
      />

      <p className="relative text-sm font-semibold tracking-wide text-muted uppercase">{LABEL[info.key]}</p>

      <div className={`relative rounded-full bg-surface p-3 shadow-xl ${done ? 'levelup-pop' : ''}`}>
        <ProgressRing value={fill} max={1} size={224} stroke={18} color={COLOR[info.key]} transitionMs={FILL_MS}>
          <span className="flex flex-col items-center leading-none">
            <span className="text-sm text-muted">Niveau</span>
            <span key={done ? 'to' : 'from'} className={`text-7xl font-black tabular-nums ${done ? 'levelup-pop' : ''}`}>
              {done ? info.to : info.from}
            </span>
          </span>
        </ProgressRing>
      </div>

      {done && (
        <div className="levelup-rise relative flex flex-col items-center gap-2">
          <p className="text-3xl font-black">Niveau {info.to} !</p>
          {info.also.length > 0 && (
            <p className="text-muted">Et aussi : {info.also.map((a) => `${LABEL[a.key]} niveau ${a.to}`).join(' · ')}</p>
          )}
          <button type="button" className="mt-4 rounded-xl bg-accent px-8 py-3 font-semibold text-white" onClick={onClose}>
            Continuer
          </button>
        </div>
      )}

      {done && <Fireworks size="big" />}
    </div>
  )
}
