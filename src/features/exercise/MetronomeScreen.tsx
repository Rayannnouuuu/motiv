import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../design/icons'
import { Button } from '../../ui/Button'
import { Stepper } from '../../ui/Stepper'
import type { Listener } from './listen'
import { consistency, readRhythm, TOLERANCE_BPM, type RhythmRead, type Verdict } from './rhythm'

/** Plus rien entendu depuis 2,5 s : on attend la reprise. */
const IDLE_MS = 2500
const KEEP = 16
/** Débattement de l'aiguille de chaque côté, en degrés. */
const SWING = 80
const ZONE = (TOLERANCE_BPM / 15) * SWING

const STATUS: Record<Verdict, string> = { on: 'Dans le temps', rush: 'Tu presses', drag: 'Tu traînes' }

/** Point de l'arc à l'angle `deg` (0 = en haut), rayon r autour de (120, 120). */
const at = (deg: number, r: number) => [120 + r * Math.sin((deg * Math.PI) / 180), 120 - r * Math.cos((deg * Math.PI) / 180)]
const arc = (from: number, to: number, r = 100) => {
  const [x1, y1] = at(from, r)
  const [x2, y2] = at(to, r)
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`
}

function Gauge({ needle, on }: { needle: number; on: boolean }) {
  return (
    <svg viewBox="0 0 240 140" className="w-full max-w-72" aria-hidden>
      <path d={arc(-SWING, SWING)} className="stroke-fill-strong" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d={arc(-ZONE, ZONE)} className="stroke-guitar" strokeWidth="10" fill="none" strokeLinecap="round" />
      {[-60, -40, -20, 20, 40, 60].map((d) => {
        const [x1, y1] = at(d, 82)
        const [x2, y2] = at(d, 74)
        return <line key={d} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-faint" strokeWidth="2" strokeLinecap="round" />
      })}
      <g style={{ transform: `rotate(${needle * SWING}deg)`, transformOrigin: '120px 120px', transition: 'transform 250ms ease-out' }}>
        <line x1="120" y1="120" x2="120" y2="28" className={on ? 'stroke-guitar' : 'stroke-ink'} strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx="120" cy="120" r="7" className={on ? 'fill-guitar' : 'fill-ink'} />
      <text x="22" y="138" className="fill-muted text-[10px] font-semibold tracking-widest">
        TRAÎNE
      </text>
      <text x="218" y="138" textAnchor="end" className="fill-muted text-[10px] font-semibold tracking-widest">
        PRESSE
      </text>
    </svg>
  )
}

/**
 * Métronome en plein écran (lot 7), tout sur une page : le tempo (− / +), les temps qui s'allument, et le micro qui
 * écoute ta guitare. Tempo joué, dans le temps ou non (± 5 bpm), stabilité, régularité. « Terminer » arrête tout.
 */
export function MetronomeScreen({
  bpm,
  onBpm,
  beat,
  beats,
  listener,
  onEnd,
}: {
  bpm: number
  onBpm: (n: number) => void
  beat: number
  beats: number
  listener: Listener | null
  onEnd: () => void
}) {
  const [state, setState] = useState<'starting' | 'listening' | 'denied'>('starting')
  const [read, setRead] = useState<RhythmRead | null>(null)
  const [verdicts, setVerdicts] = useState<Verdict[]>([])
  const [idle, setIdle] = useState(true)
  const onsets = useRef<number[]>([])
  const lastAt = useRef(0)

  useEffect(() => {
    if (!listener) return
    let live = true
    listener.ready.then(
      () => live && setState('listening'),
      () => live && setState('denied'),
    )
    listener.onOnset = (t) => {
      onsets.current = [...onsets.current, t].slice(-KEEP)
      lastAt.current = Date.now()
      setIdle(false)
      const r = readRhythm(onsets.current, bpm)
      setRead(r)
      if (r.verdict) setVerdicts((v) => [...v, r.verdict!])
    }
    const timer = setInterval(() => {
      if (Date.now() - lastAt.current > IDLE_MS) {
        setIdle(true)
        // Une reprise repart de zéro : l'intervalle avec la dernière note d'avant ne veut rien dire.
        onsets.current = []
      }
    }, 500)
    return () => {
      live = false
      listener.onOnset = null
      clearInterval(timer)
    }
  }, [listener, bpm])

  // Le tempo change : la lecture repart de zéro.
  useEffect(() => {
    onsets.current = []
    setRead(null)
  }, [bpm])

  const showing = !idle && read?.verdict ? read : null
  const on = showing?.verdict === 'on'
  const score = consistency(verdicts)
  const status = !listener
    ? 'Métronome seul'
    : state === 'denied'
      ? 'Micro refusé'
      : state === 'starting'
        ? 'Préparation du micro…'
        : showing
          ? STATUS[showing.verdict!]
          : 'Joue, j’écoute…'

  return createPortal(
    <div
      role="dialog"
      aria-modal
      aria-label="Métronome"
      className="fixed inset-0 z-50 flex flex-col items-center bg-bg px-5 pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),20px)]"
    >
      <p className="t-overline mt-4 flex items-center gap-1.5 text-guitar">
        <Icon name="guitar" />
        Métronome · dans le temps à ±{TOLERANCE_BPM} bpm
      </p>
      <div className="mt-2 w-full">
        <Stepper tone="guitar" label="Objectif" onMinus={() => onBpm(bpm - 1)} onPlus={() => onBpm(bpm + 1)}>
          <p className="tabular-nums">
            <span className="t-large">{bpm}</span> <span className="t-footnote text-muted">bpm</span>
          </p>
        </Stepper>
      </div>
      <div aria-hidden className="mt-3 flex justify-center gap-3">
        {Array.from({ length: beats }, (_, i) => (
          <span
            key={i}
            className={`size-3 rounded-full transition-transform duration-100 ${beat === i ? `scale-125 ${i === 0 ? 'bg-ink' : 'bg-guitar'}` : 'bg-fill-strong'}`}
          />
        ))}
      </div>

      <div className="mt-4 flex w-full flex-1 flex-col items-center justify-center gap-2">
        <Gauge needle={showing?.needle ?? 0} on={on} />
        <p role="status" aria-live="polite" className={`t-headline tracking-widest uppercase ${on ? 'text-guitar' : 'text-ink'}`}>
          {status}
        </p>
        <p
          className={`font-display text-[88px] leading-none font-bold tabular-nums ${on ? 'text-guitar' : 'text-ink'}`}
          aria-label={showing ? `${showing.bpm} bpm joués` : undefined}
        >
          {showing?.bpm ?? '–'}
        </p>
        <p className="t-footnote rounded-full bg-fill px-3 py-1 font-semibold tracking-widest text-muted uppercase">
          {showing && showing.stable >= 3 ? 'Stable' : 'Stabilité'}
        </p>
        <div className="flex gap-2" aria-label={`Stabilité ${showing?.stable ?? 0} sur 4`} role="img">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-11 w-9 rounded-md ${showing && i < showing.stable ? 'bg-guitar' : 'bg-fill-strong'}`} />
          ))}
        </div>
        {state === 'denied' && (
          <p role="alert" className="t-subhead mt-2 text-center text-danger">
            Autorise le micro dans les réglages du téléphone (Safari › Micro), puis réessaie.
          </p>
        )}
      </div>

      <div className="flex w-full flex-col gap-2">
        <div className="t-footnote flex justify-between text-muted">
          <span>Régularité</span>
          <span className="tabular-nums">{score === null ? '—' : `${score} %`}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-fill-strong">
          <div className="h-full rounded-full bg-guitar transition-[width]" style={{ width: `${score ?? 0}%` }} />
        </div>
        <p className="t-footnote mt-1 text-center text-muted">
          Pose le téléphone près de la guitare, sans écouteurs : le clic est filtré du micro. Rien n’est enregistré.
        </p>
        <Button tone="danger" className="mt-2 w-full" onClick={onEnd}>
          <Icon name="stop" />
          Terminer
        </Button>
      </div>
    </div>,
    document.body,
  )
}
