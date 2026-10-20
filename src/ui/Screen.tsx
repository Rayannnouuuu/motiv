import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Écran principal, même gabarit sur chaque onglet (REFONTE §7) : un surtitre en capitales (date, période), le
 * titre, une seule pastille à droite. Quand le titre sort de l'écran au défilement, une barre translucide prend
 * le relais avec le titre en petit (le contenu passe flouté dessous).
 */
export function Screen({
  title,
  overline,
  pill,
  leading,
  trailing,
  children,
}: {
  title: string
  overline?: ReactNode
  pill?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  children: ReactNode
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const el = heading.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting), { rootMargin: '-44px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      {/* Barre du haut (44 pt), comme sur iPhone : boutons à droite ; fond translucide et titre seulement une fois défilé. */}
      <div className="fixed inset-x-0 top-0 z-20 pt-[env(safe-area-inset-top)]">
        <div
          aria-hidden
          className={`material absolute inset-0 border-b transition-[opacity,border-color] duration-200 ${compact ? 'border-line opacity-100' : 'border-transparent opacity-0'}`}
        />
        <div className="relative mx-auto flex h-11 max-w-md items-center justify-center px-4">
          <p aria-hidden className={`t-headline transition-opacity duration-200 ${compact ? 'opacity-100' : 'opacity-0'}`}>
            {title}
          </p>
          {leading && <div className="absolute left-4 flex items-center">{leading}</div>}
          {trailing && <div className="absolute right-4 flex items-center">{trailing}</div>}
        </div>
      </div>
      <header className="animate-page flex items-end justify-between gap-3 pt-11.5 pb-6">
        <div className="min-w-0">
          {overline && <p className="t-overline text-muted">{overline}</p>}
          <h1 ref={heading} className="t-large mt-1">
            {title}
          </h1>
        </div>
        {pill && <div className="mb-1 shrink-0">{pill}</div>}
      </header>
      <div className="animate-page [animation-delay:120ms]">{children}</div>
    </>
  )
}
