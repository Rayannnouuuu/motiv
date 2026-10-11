import { Chip } from '../../ui/Chip'

export const PRESETS = [15, 30, 45, 60] as const
export type DurationChoice = (typeof PRESETS)[number] | 'other' | null

export function parseDuration(choice: DurationChoice, other: string): number | null {
  if (choice === null) return null
  if (choice !== 'other') return choice
  const n = Number(other)
  return Number.isInteger(n) && n > 0 && n <= 600 ? n : null
}

export function StepDuration({ choice, other, yesterday, onChoice, onOther, onYesterday }: {
  choice: DurationChoice
  other: string
  yesterday: boolean
  onChoice: (c: DurationChoice) => void
  onOther: (v: string) => void
  onYesterday: (y: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Combien de temps ?</h1>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Chip key={p} selected={choice === p} onClick={() => onChoice(p)}>
            {p}
          </Chip>
        ))}
        <Chip selected={choice === 'other'} onClick={() => onChoice('other')}>
          autre
        </Chip>
      </div>
      {choice === 'other' && (
        <label className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={600}
            autoFocus
            aria-label="Durée en minutes"
            value={other}
            onChange={(e) => onOther(e.target.value)}
            className="w-28 rounded-xl border border-line bg-surface px-3 py-2 text-lg tabular-nums"
          />
          <span className="text-muted">min</span>
        </label>
      )}
      <div className="flex gap-2">
        <Chip selected={!yesterday} onClick={() => onYesterday(false)}>
          Aujourd'hui
        </Chip>
        <Chip selected={yesterday} onClick={() => onYesterday(true)}>
          Hier
        </Chip>
      </div>
    </div>
  )
}
