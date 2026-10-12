import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * Liste groupée façon Réglages iOS : un en-tête discret, des lignes dans une carte arrondie séparées
 * par un filet qui commence après l'icône, un pied de texte explicatif.
 */
export function Group({ header, footer, children, className = '', labelledBy }: { header?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string; labelledBy?: string }) {
  return (
    <section className={`flex flex-col ${className}`} aria-labelledby={labelledBy}>
      {header && <h2 id={labelledBy} className="t-footnote px-4 pb-1.5 text-muted uppercase">{header}</h2>}
      <div className="rows overflow-hidden rounded-[0.75rem] bg-surface">{children}</div>
      {footer && <p className="t-footnote px-4 pt-1.5 text-muted">{footer}</p>}
    </section>
  )
}

const ROW = 'flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left'

function Chevron() {
  return (
    <svg width="8" height="13" viewBox="0 0 8 13" className="shrink-0 text-faint" aria-hidden>
      <path d="M1.5 1.5 6.5 6.5 1.5 11.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Ligne : libellé (+ sous-titre), valeur à droite ; lien ou bouton selon `to` / `onClick`. */
export function Row({ title, subtitle, detail, accessory, icon, to, onClick, chevron, children, className = '', ...aria }: {
  title?: ReactNode
  subtitle?: ReactNode
  detail?: ReactNode
  /** Contrôle à droite (interrupteur, bouton) : la ligne n'est alors pas cliquable en entier. */
  accessory?: ReactNode
  icon?: ReactNode
  to?: string
  onClick?: () => void
  chevron?: boolean
  children?: ReactNode
  className?: string
  'aria-label'?: string
}) {
  const body = (
    <>
      {icon}
      <span className="flex min-w-0 flex-1 flex-col">
        {title !== undefined && <span className="t-body truncate">{title}</span>}
        {subtitle && <span className="t-subhead line-clamp-2 text-muted">{subtitle}</span>}
        {children}
      </span>
      {detail !== undefined && <span className="t-body shrink-0 text-muted tabular-nums">{detail}</span>}
      {accessory}
      {(chevron ?? Boolean(to)) && <Chevron />}
    </>
  )
  if (to)
    return (
      <Link to={to} className={`tap-row ${ROW} ${className}`} {...aria}>
        {body}
      </Link>
    )
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={`tap-row ${ROW} ${className}`} {...aria}>
        {body}
      </button>
    )
  return <div className={`${ROW} ${className}`}>{body}</div>
}

/** Pastille d'icône colorée en tête de ligne (comme dans Réglages). */
export function RowIcon({ children, color = 'accent' }: { children: ReactNode; color?: 'accent' | 'guitar' | 'sport' | 'muted' }) {
  const bg = { accent: 'bg-accent', guitar: 'bg-guitar', sport: 'bg-sport', muted: 'bg-faint' }[color]
  return <span className={`flex h-[1.875rem] w-[1.875rem] shrink-0 items-center justify-center rounded-[0.5rem] text-[1rem] text-white ${bg}`}>{children}</span>
}
