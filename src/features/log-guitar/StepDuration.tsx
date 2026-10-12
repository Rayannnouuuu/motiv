import { Segmented } from '../../ui/Segmented'
import { PRESETS, type DurationChoice } from './duration'

const tile = (selected: boolean) =>
  `tap-scale flex h-[4.5rem] flex-col items-center justify-center rounded-[1rem] transition-colors duration-200 ${
    selected ? 'bg-accent text-white shadow-[0_6px_16px_color-mix(in_srgb,var(--accent)_35%,transparent)]' : 'bg-surface text-ink shadow-card'
  }`

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
      <h1 className="t-title1">Combien de temps ?</h1>
      <div className="grid grid-cols-3 gap-2.5">
        {PRESETS.map((p) => (
          <button key={p} type="button" aria-pressed={choice === p} aria-label={String(p)} onClick={() => onChoice(p)} className={tile(choice === p)}>
            <span className="t-title2 tabular-nums">{p}</span>
            <span className={`t-caption ${choice === p ? 'text-white/80' : 'text-muted'}`}>min</span>
          </button>
        ))}
        <button type="button" aria-pressed={choice === 'other'} onClick={() => onChoice('other')} className={tile(choice === 'other')}>
          <span className="t-headline">autre</span>
        </button>
      </div>
      {choice === 'other' && (
        <label className="animate-rise flex items-center gap-3 rounded-[0.75rem] bg-surface px-4 py-2">
          <span className="t-body flex-1">Durée</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={600}
            autoFocus
            aria-label="Durée en minutes"
            value={other}
            onChange={(e) => onOther(e.target.value)}
            className="t-title3 w-24 bg-transparent text-right tabular-nums outline-none"
          />
          <span className="t-body text-muted">min</span>
        </label>
      )}
      <Segmented
        label="Jour"
        options={[
          { value: 'today', label: "Aujourd'hui" },
          { value: 'yesterday', label: 'Hier' },
        ]}
        value={yesterday ? 'yesterday' : 'today'}
        onChange={(v) => onYesterday(v === 'yesterday')}
      />
    </div>
  )
}
