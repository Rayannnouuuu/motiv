import type { HTMLAttributes } from 'react'

/** Surface blanche arrondie sur le fond gris groupé (pas de bordure : la couleur suffit à séparer). */
export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`rounded-[1.25rem] bg-surface p-4 shadow-card ${className}`} />
}
