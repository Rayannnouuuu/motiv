import { TONE, type Tone } from '../design/tone'
import type { Rating } from '../domain/types'
import { haptic } from './spring'

const VALUES: Rating[] = [1, 2, 3, 4, 5]

/** Note de 1 à 5 : cinq grandes pastilles, la choisie et celles d'avant se remplissent. */
export function RatingPicker({
  label,
  hint,
  value,
  onChange,
  tone,
}: {
  label: string
  hint?: string
  value: Rating | null
  onChange: (r: Rating) => void
  tone: Tone
}) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="t-headline pb-0.5">{label}</legend>
      {hint && <p className="t-subhead -mt-1.5 text-muted">{hint}</p>}
      <div role="radiogroup" aria-label={label} className="flex gap-2">
        {VALUES.map((v) => {
          const on = value !== null && v <= value
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={value === v}
              onClick={() => {
                haptic()
                onChange(v)
              }}
              className={`tap-scale t-title3 h-14 flex-1 rounded-xl tabular-nums transition-colors duration-200 ${
                value === v ? TONE.solid[tone] : on ? TONE.tint[tone] : 'bg-surface text-ink shadow-card'
              }`}
            >
              {v}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
