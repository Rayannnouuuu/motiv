import type { HTMLAttributes } from 'react'

/** Surface arrondie sur le fond groupé (pas de bordure : la couleur suffit à séparer). */
export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`rounded-2xl bg-surface p-4 shadow-card ${className}`} />
}
