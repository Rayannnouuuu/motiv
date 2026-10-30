import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../design/icons'

/** Titre de section (REFONTE §7) : titre à gauche, un lien ou un repère à droite, 12 px avant le contenu. */
export function SectionHeader({ id, title, action }: { id?: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 pb-3">
      <h2 id={id} className="t-headline">
        {title}
      </h2>
      {action && <div className="t-footnote shrink-0 font-semibold text-muted">{action}</div>}
    </div>
  )
}

/**
 * Liste groupée : le titre de section, des lignes dans une carte bordée séparées par un filet qui commence
 * après l'icône, un pied de texte explicatif.
 */
export function Group({
  header,
  action,
  footer,
  children,
  className = '',
  labelledBy,
}: {
  header?: ReactNode
  action?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
  labelledBy?: string
}) {
  return (
    <section className={`flex flex-col ${className}`} aria-labelledby={labelledBy}>
      {header && <SectionHeader id={labelledBy} title={header} action={action} />}
      <div className="rows overflow-hidden rounded-xl border border-line bg-surface">{children}</div>
      {footer && <p className="t-footnote px-1 pt-2 text-muted">{footer}</p>}
    </section>
  )
}

export const ROW = 'flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left'

/** Chevron de fin de ligne : le dessin colle au bord, comme sur iPhone. */
export function RowChevron({ className = '' }: { className?: string }) {
  return <Icon name="chevron" size="1.4em" className={`-mx-2 text-faint ${className}`} />
}

/** Ligne : libellé (+ sous-titre), valeur à droite ; lien ou bouton selon `to` / `onClick`. */
export function Row({
  title,
  subtitle,
  detail,
  accessory,
  icon,
  to,
  onClick,
  chevron,
  children,
  className = '',
  ...aria
}: {
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
      {(chevron ?? Boolean(to)) && <RowChevron />}
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
