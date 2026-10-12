import type { ButtonHTMLAttributes } from 'react'

/** Pastille de choix (exclusif), teintée quand elle est choisie. */
export function Chip({ selected, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...props}
      className={`tap-scale t-subhead min-h-9 rounded-full px-4 py-1.5 font-semibold tabular-nums transition-colors ${
        selected ? 'bg-accent text-white' : 'bg-fill text-ink'
      } ${className}`}
    />
  )
}
