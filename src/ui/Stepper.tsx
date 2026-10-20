import type { ReactNode } from 'react'
import { Icon } from '../design/icons'
import { TONE, type Tone } from '../design/tone'

/** Valeur centrale avec de grands boutons − / + (utilisables en salle, d'une main). */
export function Stepper({ label, onMinus, onPlus, tone, children }: { label: string; onMinus: () => void; onPlus: () => void; tone: Tone; children: ReactNode }) {
  const btn = `tap-scale flex size-14 shrink-0 items-center justify-center rounded-full bg-fill ${TONE.text[tone]}`
  return (
    <div className="flex items-center gap-3">
      <button type="button" aria-label={`${label} −`} onClick={onMinus} className={btn}>
        <Icon name="minus" size={24} />
      </button>
      <div className="min-w-0 flex-1 text-center">
        <p className="t-footnote text-muted">{label}</p>
        {children}
      </div>
      <button type="button" aria-label={`${label} +`} onClick={onPlus} className={btn}>
        <Icon name="plus" size={24} />
      </button>
    </div>
  )
}
