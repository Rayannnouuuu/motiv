import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

/** Boutons iOS : plein (action principale), teinté (secondaire), simple texte. */
const STYLES: Record<Variant, string> = {
  primary: 'tap-scale min-h-[3.125rem] bg-accent text-white',
  secondary: 'tap-scale min-h-[3.125rem] bg-accent/12 text-accent',
  ghost: 'tap min-h-11 text-accent',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`t-headline rounded-[0.875rem] px-5 py-2.5 disabled:opacity-35 ${STYLES[variant]} ${className}`}
    />
  )
}
