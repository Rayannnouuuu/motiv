import type { ButtonHTMLAttributes } from 'react'
import { TONE, type Tone } from '../design/tone'

type Variant = 'primary' | 'secondary' | 'ghost'

/** Boutons iOS : plein (action principale), teinté (secondaire), simple texte. */
const SHAPE: Record<Variant, string> = {
  primary: 'tap-scale min-h-12.5',
  secondary: 'tap-scale min-h-12.5',
  ghost: 'tap min-h-11',
}

/** Couleur selon ce que le bouton concerne (orange par défaut : action globale), ou rouge pour détruire. */
const COLOR: Record<Variant, Record<Tone | 'danger', string>> = {
  primary: { ...TONE.solid, danger: 'bg-danger text-on-danger' },
  secondary: { ...TONE.tint, danger: 'bg-danger/12 text-danger' },
  ghost: { ...TONE.text, danger: 'text-danger' },
}

export function Button({ variant = 'primary', tone = 'accent', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  tone?: Tone | 'danger'
}) {
  return (
    <button
      type="button"
      {...props}
      className={`t-headline flex items-center justify-center gap-1.5 rounded-lg px-5 py-2.5 disabled:opacity-35 ${SHAPE[variant]} ${COLOR[variant][tone]} ${className}`}
    />
  )
}
