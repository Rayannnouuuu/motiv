/**
 * Bip de fin de repos, en Web Audio. Sur iPhone, le son ne peut démarrer qu'après un geste :
 * `primeBeep` crée (ou relance) le contexte audio au tap « Série faite », `beep` joue plus tard.
 * navigator.audioSession n'est pas touché : la musique de la salle continue.
 */
let ctx: AudioContext | null = null

const FREQ = 880
const GAIN = 0.25
const LENGTH = 0.12
const GAP = 0.08
const FADE = 0.005

export function primeBeep(): void {
  try {
    const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    ctx ??= new Ctor()
    if (ctx.state !== 'running') ctx.resume().catch(() => {})
  } catch {
    // audio indisponible : le minuteur reste visuel
  }
}

/** Deux bips de 880 Hz, seulement si le contexte audio existe et tourne. */
export function beep(): void {
  if (!ctx || ctx.state !== 'running') return
  try {
    const t0 = ctx.currentTime
    for (const start of [t0, t0 + LENGTH + GAP]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = FREQ
      // Attaque et relâche très courtes : pas de clic.
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(GAIN, start + FADE)
      gain.gain.setValueAtTime(GAIN, start + LENGTH - FADE)
      gain.gain.linearRampToValueAtTime(0, start + LENGTH)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + LENGTH)
    }
  } catch {
    // audio indisponible
  }
}
