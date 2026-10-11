import type { Rating } from '../domain/types'

const VALUES: Rating[] = [1, 2, 3, 4, 5]

export function RatingPicker({ label, value, onChange }: { label: string; value: Rating | null; onChange: (r: Rating) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex gap-2">
        {VALUES.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={`h-12 flex-1 rounded-xl text-lg font-semibold tabular-nums ${value === v ? 'bg-accent text-white' : 'bg-surface-2'}`}
          >
            {v}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
