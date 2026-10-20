import type { ButtonHTMLAttributes } from 'react'
import { TONE, type Tone } from '../design/tone'

/** Pastille de choix (exclusif), pleine quand elle est choisie. */
export function Chip({ selected, tone = 'accent', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean; tone?: Tone }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...props}
      className={`hit tap-scale t-subhead min-h-9 rounded-full px-4 py-1.5 font-semibold tabular-nums transition-colors ${
        selected ? TONE.solid[tone] : 'bg-fill text-ink'
      } ${className}`}
    />
  )
}
