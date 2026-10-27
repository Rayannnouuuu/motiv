/**
 * Écoute du micro pour le rythme (lot 7) : détecte les attaques (coup de médiator) et donne leur instant.
 * Tout reste sur le téléphone : le son n'est ni enregistré ni envoyé.
 */

/**
 * Détecteur d'attaques, bloc par bloc (128 échantillons, ~3 ms) : énergie du bloc comparée à sa moyenne lente.
 * Une attaque = l'énergie franchit 3 fois la moyenne ; puis 70 ms de pause (une note ne compte qu'une fois).
 */
const WORKLET = `
class MotivOnset extends AudioWorkletProcessor {
  constructor() { super(); this.slow = 0; this.above = false; this.last = -1 }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (!ch) return true
    let e = 0
    for (let i = 0; i < ch.length; i++) e += ch[i] * ch[i]
    e /= ch.length
    const threshold = Math.max(5e-5, this.slow * 3)
    const above = e > threshold
    if (above && !this.above && currentTime - this.last > 0.07) {
      this.last = currentTime
      this.port.postMessage(currentTime)
    }
    this.above = above
    this.slow = this.slow * 0.97 + e * 0.03
    return true
  }
}
registerProcessor('motiv-onset', MotivOnset)
`

import { setAudioSession } from './audioSession'

export const canListen = () => typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && 'AudioContext' in window

/** Ce que l'écran dit quand le micro ne démarre pas. */
export function micError(e: unknown): string {
  const name = e instanceof Error || e instanceof DOMException ? e.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Le micro est bloqué pour MOTIV : Réglages › Safari › Micro (ou aA › Réglages du site), puis relance le métronome.'
  if (name === 'NotFoundError') return 'Aucun micro trouvé sur cet appareil.'
  if (name === 'NotReadableError') return 'Le micro est déjà utilisé par une autre appli (appel, dictée…). Ferme-la, puis relance.'
  return `Le micro ne démarre pas${name ? ` (${name})` : ''}. Le métronome marche quand même.`
}

/** Détecteur de secours (navigateur sans AudioWorklet) : le même calcul, lu toutes les 10 ms. */
function pollOnsets(ctx: AudioContext, input: AudioNode, emit: (t: number) => void): () => void {
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 512
  input.connect(analyser)
  const buf = new Float32Array(analyser.fftSize)
  let slow = 0
  let above = false
  let last = -1
  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(buf)
    let e = 0
    for (const x of buf) e += x * x
    e /= buf.length
    const t = ctx.currentTime
    const now = e > Math.max(5e-5, slow * 3)
    if (now && !above && t - last > 0.07) {
      last = t
      emit(t)
    }
    above = now
    slow = slow * 0.9 + e * 0.1
  }, 10)
  return () => clearInterval(timer)
}

export interface Listener {
  /** Résolue quand le micro écoute ; rejetée si refusé. */
  ready: Promise<void>
  /** Reçoit l'instant (secondes) de chaque attaque. */
  onOnset: ((t: number) => void) | null
  /** Niveau du micro (0 à 1, valeur efficace), une dizaine de fois par seconde : voir si la guitare est entendue. */
  onLevel: ((rms: number) => void) | null
  stop(): void
}

/** À appeler dans le geste de l'utilisateur : le contexte audio démarre alors tout de suite sur iPhone. */
export function startListening(): Listener {
  // Sans ça, iPhone (mode « playback » du métronome) refuse le micro.
  setAudioSession('play-and-record')
  const ctx = new AudioContext()
  ctx.resume().catch(() => {})
  let stream: MediaStream | null = null
  let stopped = false
  let stopPolling: (() => void) | null = null
  let stopLevel: (() => void) | null = null
  const listener: Listener = {
    onOnset: null,
    onLevel: null,
    ready: (async () => {
      // Micro brut : l'annulation d'écho d'iPhone traite le son comme une voix (elle étouffe la guitare) et baisse le
      // volume du métronome. Le clic du haut-parleur est écarté autrement : il est aigu, le détecteur écoute sous 2 kHz.
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      if (stopped) return stream.getTracks().forEach((t) => t.stop())
      const source = ctx.createMediaStreamSource(stream)
      // Bande 150 Hz – 2 kHz : sans le grave (souffle, poignée) ni l'aigu (le clic du métronome, 3,8 à 5,2 kHz).
      const high = ctx.createBiquadFilter()
      high.type = 'highpass'
      high.frequency.value = 150
      source.connect(high)
      let filter: AudioNode = high
      for (let i = 0; i < 3; i++) {
        const low = ctx.createBiquadFilter()
        low.type = 'lowpass'
        low.frequency.value = 2000
        filter.connect(low)
        filter = low
      }
      // Niveau du micro pour l'écran : on voit si la guitare arrive.
      const meter = ctx.createAnalyser()
      meter.fftSize = 1024
      source.connect(meter)
      const samples = new Float32Array(meter.fftSize)
      const levelTimer = setInterval(() => {
        meter.getFloatTimeDomainData(samples)
        let e = 0
        for (const x of samples) e += x * x
        listener.onLevel?.(Math.sqrt(e / samples.length))
      }, 100)
      stopLevel = () => clearInterval(levelTimer)
      // Relié à la sortie à volume nul : sinon certains navigateurs ne font pas tourner le détecteur.
      const mute = ctx.createGain()
      mute.gain.value = 0
      mute.connect(ctx.destination)
      const emit = (t: number) => listener.onOnset?.(t)
      try {
        const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }))
        try {
          await ctx.audioWorklet.addModule(url)
        } finally {
          URL.revokeObjectURL(url)
        }
        const node = new AudioWorkletNode(ctx, 'motiv-onset')
        node.port.onmessage = (e: MessageEvent<number>) => emit(e.data)
        filter.connect(node).connect(mute)
      } catch {
        stopPolling = pollOnsets(ctx, filter, emit)
        filter.connect(mute)
      }
    })(),
    stop() {
      stopped = true
      stopPolling?.()
      stopLevel?.()
      stream?.getTracks().forEach((t) => t.stop())
      setAudioSession('playback')
      ctx.close().catch(() => {})
    },
  }
  return listener
}
