import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const STYLES: Record<Variant, string> = {
  primary: 'bg-accent text-white',
  secondary: 'border border-accent text-accent',
  ghost: 'text-muted',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-xl px-4 py-3 text-base font-semibold transition active:scale-[0.98] disabled:opacity-40 ${STYLES[variant]} ${className}`}
    />
  )
}
