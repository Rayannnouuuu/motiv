import type { HTMLAttributes } from 'react'

/** Carte : surface bordée d'un trait, rayon 16 ; `hero` pour la seule carte importante d'un écran (rayon 20). */
export function Card({ hero = false, className = '', ...props }: HTMLAttributes<HTMLDivElement> & { hero?: boolean }) {
  return <div {...props} className={`border border-line bg-surface shadow-card ${hero ? 'rounded-2xl px-5 py-4.5' : 'rounded-xl p-4'} ${className}`} />
}
