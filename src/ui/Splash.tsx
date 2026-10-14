import { useEffect, useRef, useState } from 'react'

const SIZE = 132 // taille de la flamme, en px
const STEP = 3 // un grain tous les 3 px de la flamme
const GATHER = 1700 // les grains se rassemblent (ms)
const HOLD = 700 // la flamme brille
const FADE = 600 // l'écran s'efface sur l'appli

const FONT = `${SIZE}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`

interface Grain {
  sx: number
  sy: number
  tx: number
  ty: number
  delay: number
  swirl: number
  color: string
}

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const easeOut = (t: number) => 1 - (1 - t) ** 3

/** Les pixels de 🔥, chacun parti d'un point au hasard de l'écran. null si le canvas n'est pas disponible. */
function grains(w: number, h: number): Grain[] | null {
  const off = document.createElement('canvas')
  off.width = off.height = SIZE
  const ctx = off.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.font = FONT
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('🔥', SIZE / 2, SIZE / 2)
  const px = ctx.getImageData(0, 0, SIZE, SIZE).data
  const out: Grain[] = []
  for (let y = 0; y < SIZE; y += STEP)
    for (let x = 0; x < SIZE; x += STEP) {
      const i = (y * SIZE + x) * 4
      if (px[i + 3] < 128) continue
      out.push({
        sx: (Math.random() * 1.4 - 0.2) * w,
        sy: (Math.random() * 1.4 - 0.2) * h,
        tx: w / 2 - SIZE / 2 + x,
        ty: h / 2 - SIZE / 2 + y,
        delay: Math.random() * 450,
        swirl: (Math.random() - 0.5) * 160,
        color: `rgb(${px[i]},${px[i + 1]},${px[i + 2]})`,
      })
    }
  return out.length > 0 ? out : null
}

/**
 * Ouverture de l'appli : des braises venues de tout l'écran se rassemblent en flamme au centre, la flamme
 * brille, puis l'écran s'efface sur l'appli. Un toucher l'interrompt ; rien si les animations sont réduites.
 */
export function Splash() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<'gather' | 'flame' | 'out' | 'done'>(() => (reduced() ? 'done' : 'gather'))

  useEffect(() => {
    if (phase !== 'gather') return
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    const w = window.innerWidth
    const h = window.innerHeight
    const list = ctx ? grains(w, h) : null
    if (!canvas || !ctx || !list) return setPhase('done')
    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    const start = performance.now()
    let frame = 0
    const draw = (now: number) => {
      const t = now - start
      ctx.clearRect(0, 0, w, h)
      for (const g of list) {
        const p = easeOut(Math.min(1, Math.max(0, (t - g.delay) / (GATHER - 450))))
        // Trajet légèrement courbe : un écart perpendiculaire qui s'annule à l'arrivée.
        const bend = Math.sin(p * Math.PI) * g.swirl
        ctx.globalAlpha = 0.25 + 0.75 * p
        ctx.fillStyle = g.color
        ctx.fillRect(g.sx + (g.tx - g.sx) * p + bend, g.sy + (g.ty - g.sy) * p - bend * 0.5, STEP, STEP)
      }
      if (t < GATHER) frame = requestAnimationFrame(draw)
      else setPhase('flame')
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [phase])

  useEffect(() => {
    if (phase === 'flame') {
      const t = window.setTimeout(() => setPhase('out'), HOLD)
      return () => clearTimeout(t)
    }
    if (phase === 'out') {
      const t = window.setTimeout(() => setPhase('done'), FADE)
      return () => clearTimeout(t)
    }
  }, [phase])

  if (phase === 'done') return null
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[70] bg-bg transition-opacity ease-out"
      style={{ opacity: phase === 'out' ? 0 : 1, transitionDuration: `${FADE}ms` }}
      onPointerDown={() => setPhase((p) => (p === 'done' ? p : 'out'))}
    >
      <canvas ref={ref} className={`absolute inset-0 h-full w-full ${phase === 'gather' ? '' : 'hidden'}`} />
      {phase !== 'gather' && (
        <span
          className="splash-flame absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none"
          style={{ font: FONT, lineHeight: 1 }}
        >
          🔥
        </span>
      )}
    </div>
  )
}
