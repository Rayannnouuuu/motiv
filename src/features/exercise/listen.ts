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
    const threshold = Math.max(2e-5, this.slow * 3)
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

export const canListen = () =>
  typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && 'AudioWorkletNode' in window && 'AudioContext' in window

export interface Listener {
  /** Résolue quand le micro écoute ; rejetée si refusé. */
  ready: Promise<void>
  /** Reçoit l'instant (secondes) de chaque attaque. */
  onOnset: ((t: number) => void) | null
  stop(): void
}

/** À appeler dans le geste de l'utilisateur : le contexte audio démarre alors tout de suite sur iPhone. */
export function startListening(): Listener {
  const ctx = new AudioContext()
  ctx.resume().catch(() => {})
  let stream: MediaStream | null = null
  let stopped = false
  const listener: Listener = {
    onOnset: null,
    ready: (async () => {
      // Annulation d'écho : retire le clic du métronome joué par le haut-parleur. Le reste brut : les attaques comptent.
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } })
      if (stopped) return stream.getTracks().forEach((t) => t.stop())
      const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }))
      try {
        await ctx.audioWorklet.addModule(url)
      } finally {
        URL.revokeObjectURL(url)
      }
      const source = ctx.createMediaStreamSource(stream)
      // Coupe le grave (souffle, poignée) : l'attaque est plus haut.
      const filter = ctx.createBiquadFilter()
      filter.type = 'highpass'
      filter.frequency.value = 200
      const node = new AudioWorkletNode(ctx, 'motiv-onset')
      node.port.onmessage = (e: MessageEvent<number>) => listener.onOnset?.(e.data)
      // Relié à la sortie à volume nul : sinon certains navigateurs ne font pas tourner le détecteur.
      const mute = ctx.createGain()
      mute.gain.value = 0
      source.connect(filter).connect(node).connect(mute).connect(ctx.destination)
    })(),
    stop() {
      stopped = true
      stream?.getTracks().forEach((t) => t.stop())
      ctx.close().catch(() => {})
    },
  }
  return listener
}
