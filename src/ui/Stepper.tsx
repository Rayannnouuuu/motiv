import type { ReactNode } from 'react'

/** Valeur centrale avec boutons − / + de grande taille (utilisable en salle). */
export function Stepper({ label, onMinus, onPlus, children }: { label: string; onMinus: () => void; onPlus: () => void; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" aria-label={`${label} −`} onClick={onMinus} className="h-14 w-14 rounded-2xl bg-surface-2 text-2xl font-bold">
        −
      </button>
      <div className="flex-1 text-center">
        <p className="text-xs text-muted">{label}</p>
        {children}
      </div>
      <button type="button" aria-label={`${label} +`} onClick={onPlus} className="h-14 w-14 rounded-2xl bg-surface-2 text-2xl font-bold">
        +
      </button>
    </div>
  )
}
