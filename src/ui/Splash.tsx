import { useEffect, useState } from 'react'

const SHOW = 1100 // le mot et les deux traits se posent (ms)
const FADE = 400 // l'écran s'efface sur l'appli
const SEEN = 'motiv.splashSeen'

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

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

/**
 * Ouverture de l'appli, dans le style de la refonte : sur le fond de l'appli, « MOTIV » monte lettre par lettre,
 * puis les deux univers se tracent dessous (ambre pour la guitare, bleu pour le sport), et l'écran s'efface.
 * Un toucher l'interrompt ; rien si les animations sont réduites.
 */
export function Splash() {
  const [phase, setPhase] = useState<'in' | 'out' | 'done'>(() => (reduced() || alreadySeen() ? 'done' : 'in'))

  useEffect(() => {
    if (phase === 'done') return
    const t = window.setTimeout(() => setPhase(phase === 'in' ? 'out' : 'done'), phase === 'in' ? SHOW : FADE)
    return () => clearTimeout(t)
  }, [phase])

  if (phase === 'done') return null
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-bg transition-opacity ease-out"
      style={{ opacity: phase === 'out' ? 0 : 1, transitionDuration: `${FADE}ms` }}
      onPointerDown={() => setPhase('out')}
    >
      <p className="font-display text-[3.5rem] leading-none font-bold tracking-[0.08em] text-ink">
        {'MOTIV'.split('').map((c, i) => (
          <span key={i} className="splash-letter inline-block" style={{ animationDelay: `${i * 60}ms` }}>
            {c}
          </span>
        ))}
      </p>
      <div className="flex gap-2">
        <span className="splash-bar h-1.5 w-12 rounded-full bg-guitar" style={{ animationDelay: '380ms' }} />
        <span className="splash-bar h-1.5 w-12 rounded-full bg-sport" style={{ animationDelay: '480ms' }} />
      </div>
    </div>
  )
}
