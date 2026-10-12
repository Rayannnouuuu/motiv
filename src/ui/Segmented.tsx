/**
 * Contrôle segmenté iOS : une pastille qui glisse jusqu'au choix (ressort, sans rebond).
 * Chaque segment reste un bouton à bascule (aria-pressed).
 */
export function Segmented<T extends string>({ options, value, onChange, label }: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div role="group" aria-label={label} className="relative flex rounded-[0.5625rem] bg-fill p-0.5">
      <span
        aria-hidden
        className="absolute top-0.5 bottom-0.5 left-0.5 rounded-[0.4375rem] bg-surface shadow-[0_3px_8px_rgb(0_0_0/0.12),0_3px_1px_rgb(0_0_0/0.04)] transition-transform duration-500 ease-spring dark:bg-surface-2"
        style={{ width: `calc((100% - 0.25rem) / ${options.length})`, transform: `translateX(${i * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`tap t-subhead relative z-[1] min-h-8 flex-1 rounded-[0.4375rem] px-2 py-1 ${o.value === value ? 'font-semibold' : ''}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
