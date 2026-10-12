import type { ReactNode } from 'react'

/** Valeur centrale avec de grands boutons − / + (utilisables en salle, d'une main). */
export function Stepper({ label, onMinus, onPlus, children }: { label: string; onMinus: () => void; onPlus: () => void; children: ReactNode }) {
  const btn = 'tap-scale flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-fill text-accent'
  return (
    <div className="flex items-center gap-3">
      <button type="button" aria-label={`${label} −`} onClick={onMinus} className={btn}>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
          <path d="M4 10h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
      <div className="min-w-0 flex-1 text-center">
        <p className="t-footnote text-muted">{label}</p>
        {children}
      </div>
      <button type="button" aria-label={`${label} +`} onClick={onPlus} className={btn}>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
          <path d="M4 10h12M10 4v12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
