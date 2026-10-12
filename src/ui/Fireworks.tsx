import { useEffect, useRef } from 'react'

export type FireworksSize = 'small' | 'big'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  born: number
  life: number
  color: string
  r: number
}

const CONFIG = {
  // Petits : quelques gerbes près du haut, pour un log réussi.
  small: { bursts: 3, spread: 250, particles: 36, speed: 0.28, life: 1100, duration: 1900, radius: 2.2 },
  // Grands : gerbes sur tout l'écran, pour un niveau.
  big: { bursts: 11, spread: 2600, particles: 72, speed: 0.42, life: 1500, duration: 4400, radius: 3 },
} as const

const GRAVITY = 0.00025 // px/ms²
const DRAG = 0.0012 // par ms

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Feux d'artifice dessinés en canvas par-dessus l'écran. Rien n'est affiché si l'utilisateur limite les animations. */
export function Fireworks({ size, onDone }: { size: FireworksSize; onDone?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduced = prefersReducedMotion()

  useEffect(() => {
    if (reduced) {
      onDone?.()
      return
    }
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) {
      onDone?.()
      return
    }
    const cfg = CONFIG[size]
    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    const css = getComputedStyle(document.documentElement)
    const colors = ['--accent', '--guitar', '--sport'].map((v) => css.getPropertyValue(v).trim() || '#ea580c').concat('#facc15', '#f472b6')

    const particles: Particle[] = []
    const start = performance.now()
    const timers = Array.from({ length: cfg.bursts }, (_, i) =>
      window.setTimeout(
        () => {
          const cx = w * (0.15 + Math.random() * 0.7)
          const cy = size === 'small' ? h * (0.12 + Math.random() * 0.2) : h * (0.1 + Math.random() * 0.45)
          const color = colors[Math.floor(Math.random() * colors.length)]
          const now = performance.now()
          for (let k = 0; k < cfg.particles; k++) {
            const a = (k / cfg.particles) * Math.PI * 2 + Math.random() * 0.2
            const v = cfg.speed * (0.5 + Math.random() * 0.6)
            particles.push({
              x: cx,
              y: cy,
              vx: Math.cos(a) * v,
              vy: Math.sin(a) * v,
              born: now,
              life: cfg.life * (0.7 + Math.random() * 0.5),
              color: Math.random() < 0.8 ? color : colors[Math.floor(Math.random() * colors.length)],
              r: cfg.radius * (0.6 + Math.random() * 0.6),
            })
          }
        },
        (i / (cfg.bursts - 1)) * cfg.spread,
      ),
    )

    let raf = 0
    let last = start
    const frame = (now: number) => {
      const dt = Math.min(48, now - last)
      last = now
      ctx.clearRect(0, 0, w, h)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        const age = now - p.born
        if (age > p.life) {
          particles.splice(i, 1)
          continue
        }
        p.vx *= 1 - DRAG * dt
        p.vy = p.vy * (1 - DRAG * dt) + GRAVITY * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        const t = age / p.life
        ctx.globalAlpha = (1 - t) * (0.75 + 0.25 * Math.sin(age / 40)) // léger scintillement
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * (1 - t * 0.5), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      if (now - start < cfg.duration) raf = requestAnimationFrame(frame)
      else {
        ctx.clearRect(0, 0, w, h)
        onDone?.()
      }
    }
    raf = requestAnimationFrame(frame)
    return () => {
      timers.forEach(clearTimeout)
      cancelAnimationFrame(raf)
    }
    // Une seule fois par montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (reduced) return null
  return <canvas ref={ref} aria-hidden data-fireworks={size} className="pointer-events-none fixed inset-0 z-50 h-full w-full" />
}
