import type { ButtonHTMLAttributes } from 'react'

/** Bouton bascule arrondi (choix exclusif). */
export function Chip({ selected, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...props}
      className={`rounded-full px-4 py-2 font-semibold tabular-nums ${selected ? 'bg-accent text-white' : 'bg-surface-2'} ${className}`}
    />
  )
}
