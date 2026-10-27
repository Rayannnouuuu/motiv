import { useEffect, useRef, useState } from 'react'
import type { TabNote } from '../../content/exercises'
import { Icon } from '../../design/icons'
import { Segmented } from '../../ui/Segmented'
import { haptic } from '../../ui/spring'
import { Stepper } from '../../ui/Stepper'
import { setAudioSession } from './audioSession'
import { canListen, startListening, type Listener } from './listen'
import { RhythmPanel } from './RhythmPanel'
import { clampBpm, initialBpm, resubdivide, schedule, subdivisionOf, type Click, type ClickKind, type Cursor } from './metronome'

/** Ce que le métronome utilise d'un AudioContext (remplaçable dans les tests). */
export type AudioContextLike = Pick<AudioContext, 'currentTime' | 'destination' | 'state' | 'resume' | 'suspend' | 'close' | 'createOscillator' | 'createGain'>

/** Le moteur se réveille toutes les 25 ms et programme les clics des 100 ms à venir sur l'horloge audio. */
const TICK_MS = 25
const LOOKAHEAD = 0.1
const START_DELAY = 0.05
const BPM_STEP = 1
const BPM_JUMP = 5
const BEATS = 4

const TONES: Record<ClickKind, { freq: number; gain: number }> = {
  bar: { freq: 1600, gain: 0.9 },
  beat: { freq: 1000, gain: 0.6 },
  sub: { freq: 700, gain: 0.3 },
}

/** Pendant l'écoute du micro : un « tik » aigu, hors de la plage de la guitare que le détecteur écoute (sous 2 kHz). */
const TONES_LISTENING: Record<ClickKind, { freq: number; gain: number }> = {
  bar: { freq: 5200, gain: 0.9 },
  beat: { freq: 4400, gain: 0.7 },
  sub: { freq: 3800, gain: 0.4 },
}

const SUB_LABELS: Record<number, string> = { 2: 'Croches', 3: 'Triolets', 4: 'Doubles' }

function defaultContext(): AudioContextLike {
  const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return new Ctor()
}

/** Un clic = un oscillateur bref : montée en 2 ms, extinction à 40 ms. */
function playClick(ctx: AudioContextLike, { time, kind }: Click, listening: boolean) {
  const { freq, gain: peak } = (listening ? TONES_LISTENING : TONES)[kind]
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(peak, time + 0.002)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(time)
  osc.stop(time + 0.05)
}

/** Moteur audio : vit hors du rendu React, lit le tempo et la subdivision à chaque réveil. */
class Engine {
  bpm: number
  sub: number
  /** Le micro écoute : clic aigu, que le détecteur n'entend presque pas. */
  listening = false
  private ctx: AudioContextLike | null = null
  private timer: ReturnType<typeof setInterval> | undefined
  private cursor: Cursor = { nextTime: 0, index: 0 }
  private visuals = new Set<ReturnType<typeof setTimeout>>()
  private createContext: () => AudioContextLike
  private onBeat: (beat: number) => void

  constructor(bpm: number, sub: number, createContext: () => AudioContextLike, onBeat: (beat: number) => void) {
    this.bpm = bpm
    this.sub = sub
    this.createContext = createContext
    this.onBeat = onBeat
  }

  get playing() {
    return this.timer !== undefined
  }

  /** À appeler dans le geste de l'utilisateur (sinon iOS garde l'audio muet). */
  start(): boolean {
    if (this.playing) return true
    setAudioSession('playback')
    if (!this.ctx) {
      try {
        this.ctx = this.createContext()
      } catch {
        setAudioSession('auto')
        return false
      }
    }
    // Toujours : après un « Arrêter » tout juste tapé, state peut encore valoir 'running' alors que la mise en
    // veille est en cours ; le resume passe derrière elle. Sur un contexte qui tourne, il ne fait rien.
    this.ctx.resume().catch(() => {})
    this.cursor = { nextTime: this.ctx.currentTime + START_DELAY, index: 0 }
    this.tick()
    this.timer = setInterval(() => this.tick(), TICK_MS)
    return true
  }

  stop() {
    if (!this.playing) return
    clearInterval(this.timer)
    this.timer = undefined
    for (const id of this.visuals) clearTimeout(id)
    this.visuals.clear()
    this.ctx?.suspend().catch(() => {})
    setAudioSession('auto')
  }

  setSub(sub: number) {
    if (this.playing) this.cursor = resubdivide(this.cursor, this.sub, sub, this.bpm)
    this.sub = sub
  }

  dispose() {
    this.stop()
    this.ctx?.close().catch(() => {})
    this.ctx = null
  }

  private tick() {
    const ctx = this.ctx
    if (!ctx) return
    const { clicks, next } = schedule(this.cursor, ctx.currentTime, LOOKAHEAD, this.bpm, this.sub)
    this.cursor = next
    for (const click of clicks) {
      playClick(ctx, click, this.listening)
      if (click.kind === 'sub') continue
      // Le point s'allume quand le clic sonne, pas quand il est programmé.
      const beat = Math.floor((click.index % (this.sub * BEATS)) / this.sub)
      const id = setTimeout(
        () => {
          this.visuals.delete(id)
          this.onBeat(beat)
        },
        Math.max(0, (click.time - ctx.currentTime) * 1000),
      )
      this.visuals.add(id)
    }
  }
}

/**
 * Métronome de la fiche exo : réglé sur le tempo proposé (`startAt`), sinon ton record, sinon le tempo de départ
 * de l'exo. Il remonte au log le tempo réellement joué (`onPlayed`) et le tempo affiché (`onTempo`).
 */
export function Metronome({
  pattern,
  best,
  startBpm,
  startAt,
  targetBpm,
  challengeBpm,
  onPlayed,
  onTempo,
  createContext = defaultContext,
}: {
  pattern: TabNote[]
  best: number | null
  startBpm: number
  startAt?: number
  targetBpm: number
  challengeBpm: number | null
  onPlayed?: (bpm: number) => void
  onTempo?: (bpm: number) => void
  createContext?: () => AudioContextLike
}) {
  const patternSub = subdivisionOf(pattern)
  const [bpm, setBpm] = useState(() => (startAt === undefined ? initialBpm(best, startBpm) : clampBpm(startAt)))
  const [sub, setSub] = useState<number>(patternSub)
  const [playing, setPlaying] = useState(false)
  const [beat, setBeat] = useState(-1)
  const [listener, setListener] = useState<Listener | null>(null)
  const engineRef = useRef<Engine | null>(null)
  const listenerRef = useRef<Listener | null>(null)
  listenerRef.current = listener

  const engine = () => (engineRef.current ??= new Engine(bpm, sub, createContext, setBeat))

  // Arrêt quand la page passe en arrière-plan, et au démontage.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden' || !engineRef.current?.playing) return
      engineRef.current.stop()
      listenerRef.current?.stop()
      setListener(null)
      setPlaying(false)
      setBeat(-1)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      listenerRef.current?.stop()
      engineRef.current?.dispose()
      engineRef.current = null
    }
  }, [])

  /** Lancer : le métronome joue et le micro écoute, les deux dans ce toucher (sinon iPhone garde l'audio muet). */
  const toggle = () => {
    haptic()
    const e = engine()
    if (e.playing) {
      // Le micro d'abord : l'arrêt du métronome remet ensuite le mode audio normal.
      listener?.stop()
      e.stop()
      setListener(null)
      setPlaying(false)
      setBeat(-1)
    } else {
      e.listening = canListen()
      if (!e.start()) return
      setPlaying(true)
      setListener(e.listening ? startListening() : null)
      onPlayed?.(e.bpm)
    }
  }

  const changeBpm = (n: number) => {
    const next = clampBpm(n)
    if (next === bpm) return
    setBpm(next)
    onTempo?.(next)
    if (!engineRef.current) return
    engineRef.current.bpm = next
    if (engineRef.current.playing) onPlayed?.(next)
  }

  const changeSub = (next: number) => {
    setSub(next)
    if (engineRef.current) engineRef.current.setSub(next)
  }

  const shortcuts = [
    best !== null && { key: 'record', label: `Record ${best}`, value: best },
    { key: 'target', label: `Cible ${targetBpm}`, value: targetBpm },
    challengeBpm !== null && { key: 'challenge', label: `Objectif ${challengeBpm}`, value: challengeBpm },
  ].filter((s) => s !== false)
  const jump = (sign: 1 | -1) => (
    <button
      type="button"
      aria-label={`Tempo ${sign > 0 ? '+' : '−'}${BPM_JUMP}`}
      onClick={() => changeBpm(bpm + sign * BPM_JUMP)}
      className="hit tap t-footnote rounded-full bg-fill px-3 py-1.5 tabular-nums"
    >
      {sign > 0 ? '+' : '−'}
      {BPM_JUMP}
    </button>
  )

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-surface p-4 shadow-card" aria-labelledby="metronome-title">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 id="metronome-title" className="t-headline">
          Métronome
        </h2>
        {patternSub > 1 && (
          <div className="w-44">
            <Segmented
              label="Subdivision"
              options={[
                { value: '1', label: 'Noires' },
                { value: String(patternSub), label: SUB_LABELS[patternSub] },
              ]}
              value={String(sub)}
              onChange={(v) => changeSub(Number(v))}
            />
          </div>
        )}
      </div>

      <Stepper tone="guitar" label="Tempo" onMinus={() => changeBpm(bpm - BPM_STEP)} onPlus={() => changeBpm(bpm + BPM_STEP)}>
        <p className="tabular-nums">
          <span className="t-large">{bpm}</span> <span className="t-footnote text-muted">bpm</span>
        </p>
      </Stepper>

      <div className="flex flex-wrap justify-center gap-2">
        {jump(-1)}
        {shortcuts.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={bpm === clampBpm(s.value)}
            onClick={() => changeBpm(s.value)}
            className={`hit tap t-footnote flex items-center gap-1 rounded-full px-3 py-1.5 tabular-nums ${bpm === clampBpm(s.value) ? 'bg-guitar/12 font-semibold text-guitar' : 'bg-fill'}`}
          >
            {s.key === 'challenge' && <Icon name="target" />}
            {s.label}
          </button>
        ))}
        {jump(1)}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div aria-hidden className="flex flex-1 justify-center gap-3">
          {Array.from({ length: BEATS }, (_, i) => (
            <span
              key={i}
              className={`size-3 rounded-full transition-transform duration-100 ${beat === i ? `scale-125 ${i === 0 ? 'bg-ink' : 'bg-guitar'}` : 'bg-fill-strong'}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Arrêter le métronome' : 'Lancer le métronome'}
          className="tap-scale flex size-16 shrink-0 items-center justify-center rounded-full bg-guitar text-on-guitar shadow-card"
        >
          <Icon name={playing ? 'stop' : 'play'} size="1.65em" className={playing ? '' : 'ml-0.5'} />
        </button>
      </div>

      {playing ? (
        <RhythmPanel bpm={bpm} listener={listener} />
      ) : (
        <p className="t-footnote text-muted">Lance-le : le micro écoute ta guitare et te dit si tu es dans le temps. Il sonne même en mode silencieux.</p>
      )}
    </section>
  )
}
