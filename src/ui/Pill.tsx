import type { ReactNode } from 'react'

/** Pastille d'en-tête : une seule par écran (REFONTE §7). */
export function Pill({ children }: { children: ReactNode }) {
  return <span className="t-footnote inline-flex h-8 items-center rounded-full bg-surface-2 px-3 font-semibold whitespace-nowrap">{children}</span>
}
