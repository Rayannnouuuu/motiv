/**
 * Ressort physique, réglé comme chez Apple par deux paramètres :
 * - `damping` : 1 = amorti sans rebond (par défaut), < 1 = dépasse puis revient ;
 * - `response` : rapidité en secondes (ce n'est pas une durée, le ressort s'arrête quand il est posé).
 *
 * Un `SpringValue` garde sa valeur et sa vitesse : on peut le reprendre en vol (glisser), le relâcher
 * avec la vitesse du doigt, ou changer de cible sans à-coup.
 */
export interface SpringConfig {
  damping?: number
  response?: number
}

const REST_DELTA = 0.5
const REST_SPEED = 2

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export class SpringValue {
  value: number
  velocity = 0
  private frame = 0
  private onUpdate: (v: number) => void

  constructor(value: number, onUpdate: (v: number) => void) {
    this.value = value
    this.onUpdate = onUpdate
  }

  /** Suivi direct (doigt posé) : coupe l'animation et mesure la vitesse. */
  set(value: number, velocity = this.velocity) {
    this.stop()
    this.value = value
    this.velocity = velocity
    this.onUpdate(value)
  }

  stop() {
    if (this.frame) cancelAnimationFrame(this.frame)
    this.frame = 0
  }

  /** Part de la valeur et de la vitesse actuelles vers `target`. */
  to(target: number, { damping = 1, response = 0.4 }: SpringConfig = {}, onRest?: () => void) {
    this.stop()
    if (reducedMotion() || typeof requestAnimationFrame !== 'function') {
      this.value = target
      this.velocity = 0
      this.onUpdate(target)
      onRest?.()
      return
    }
    const stiffness = (2 * Math.PI / response) ** 2
    const friction = (4 * Math.PI * damping) / response
    let last = performance.now()
    const step = (now: number) => {
      // Pas fixes de 4 ms : stable même si une image saute.
      let dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      while (dt > 0) {
        const h = Math.min(dt, 0.004)
        const force = -stiffness * (this.value - target) - friction * this.velocity
        this.velocity += force * h
        this.value += this.velocity * h
        dt -= h
      }
      if (Math.abs(this.value - target) < REST_DELTA && Math.abs(this.velocity) < REST_SPEED) {
        this.value = target
        this.velocity = 0
        this.frame = 0
        this.onUpdate(target)
        onRest?.()
        return
      }
      this.onUpdate(this.value)
      this.frame = requestAnimationFrame(step)
    }
    this.frame = requestAnimationFrame(step)
  }
}

/** Résistance progressive au-delà d'une limite : plus on tire, moins ça suit. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))
}

/** Vitesse du doigt (px/s) sur les 100 dernières ms. */
export class VelocityTracker {
  private samples: { t: number; y: number }[] = []
  add(y: number) {
    const t = performance.now()
    this.samples.push({ t, y })
    while (this.samples.length > 2 && t - this.samples[0].t > 100) this.samples.shift()
  }
  velocity(): number {
    const s = this.samples
    if (s.length < 2) return 0
    const dt = (s[s.length - 1].t - s[0].t) / 1000
    return dt > 0 ? (s[s.length - 1].y - s[0].y) / dt : 0
  }
  reset() {
    this.samples = []
  }
}

/** Petite vibration aux moments qui comptent (Android ; sans effet ailleurs). */
export function haptic(kind: 'tap' | 'success' = 'tap') {
  try {
    navigator.vibrate?.(kind === 'success' ? [12, 60, 18] : 8)
  } catch {
    // non disponible
  }
}
