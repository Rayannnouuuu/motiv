import { useEffect, useRef, useState } from 'react'

const LOGO = `${import.meta.env.BASE_URL}logo-512.png`
const BG = '#7e9a67' // vert du fond du logo : le logo s'y fond, seul le personnage se reconstitue
const SIZE = 220 // taille du logo à l'écran, en px
const STEP = 3 // un grain tous les 3 px
const GATHER = 1700 // les grains se rassemblent (ms)
const HOLD = 700 // le logo net, un instant
const FADE = 600 // l'écran s'efface sur l'appli
const SEEN = 'motiv.splashSeen'

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

/** Une seule fois par ouverture : un rechargement (nouvelle version) ne la rejoue pas. */
function alreadySeen(): boolean {
  try {
    if (sessionStorage.getItem(SEEN)) return true
    sessionStorage.setItem(SEEN, '1')
  } catch {
    // stockage indisponible : on la joue
  }
  return false
}

/** Les pixels du logo hors fond vert, chacun parti d'un point au hasard de l'écran. null sans canvas. */
function grains(img: HTMLImageElement, w: number, h: number): Grain[] | null {
  const off = document.createElement('canvas')
  off.width = off.height = SIZE
  const ctx = off.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, SIZE, SIZE)
  const px = ctx.getImageData(0, 0, SIZE, SIZE).data
  const out: Grain[] = []
  for (let y = 0; y < SIZE; y += STEP)
    for (let x = 0; x < SIZE; x += STEP) {
      const i = (y * SIZE + x) * 4
      const [r, g, b] = [px[i], px[i + 1], px[i + 2]]
      // Le fond (≈ #7e9a67) n'a pas de grain : il est déjà là.
      if (Math.abs(r - 0x7e) + Math.abs(g - 0x9a) + Math.abs(b - 0x67) < 40) continue
      out.push({
        sx: (Math.random() * 1.4 - 0.2) * w,
        sy: (Math.random() * 1.4 - 0.2) * h,
        tx: w / 2 - SIZE / 2 + x,
        ty: h / 2 - SIZE / 2 + y,
        delay: Math.random() * 450,
        swirl: (Math.random() - 0.5) * 160,
        color: `rgb(${r},${g},${b})`,
      })
    }
  return out.length > 0 ? out : null
}

/**
 * Ouverture de l'appli : sur le vert du logo, des grains venus de tout l'écran reconstituent le personnage
 * et sa guitare, le logo net apparaît, puis l'écran s'efface sur l'appli. Un toucher l'interrompt ;
 * rien si les animations sont réduites.
 */
export function Splash() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<'gather' | 'logo' | 'out' | 'done'>(() => (reduced() || alreadySeen() ? 'done' : 'gather'))

  useEffect(() => {
    if (phase !== 'gather') return
    let frame = 0
    let cancelled = false
    const img = new Image()
    img.onerror = () => setPhase('done')
    img.onload = () => {
      const canvas = ref.current
      const ctx = canvas?.getContext('2d')
      const w = window.innerWidth
      const h = window.innerHeight
      const list = ctx ? grains(img, w, h) : null
      if (cancelled) return
      if (!canvas || !ctx || !list) return setPhase('done')
      const dpr = window.devicePixelRatio || 1
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
      const start = performance.now()
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
        else setPhase('logo')
      }
      frame = requestAnimationFrame(draw)
    }
    img.src = LOGO
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [phase])

  useEffect(() => {
    if (phase === 'logo') {
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
      className="fixed inset-0 z-[70] transition-opacity ease-out"
      style={{ background: BG, opacity: phase === 'out' ? 0 : 1, transitionDuration: `${FADE}ms` }}
      onPointerDown={() => setPhase((p) => (p === 'done' ? p : 'out'))}
    >
      <canvas ref={ref} className={`absolute inset-0 h-full w-full ${phase === 'gather' ? '' : 'hidden'}`} />
      {phase !== 'gather' && (
        <img src={LOGO} alt="" width={SIZE} height={SIZE} className="splash-logo absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      )}
    </div>
  )
}
