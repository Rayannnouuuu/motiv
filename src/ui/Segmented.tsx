/**
 * Contrôle segmenté iOS : une pastille qui glisse jusqu'au choix (ressort, sans rebond).
 * Chaque segment reste un bouton à bascule (aria-pressed). En sombre, la pastille (--thumb) prend le gris
 * d'iOS, plus clair que la piste même posée sur une carte.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  const i = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  return (
    <div role="group" aria-label={label} className="relative flex rounded-sm bg-fill p-0.5">
      <span
        aria-hidden
        className="absolute top-0.5 bottom-0.5 left-0.5 rounded-xs bg-thumb shadow-thumb transition-transform duration-500 ease-spring"
        style={{ width: `calc((100% - 0.25rem) / ${options.length})`, transform: `translateX(${i * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`hit tap t-subhead z-[1] min-h-8 flex-1 rounded-xs px-2 py-1 ${o.value === value ? 'font-semibold' : ''}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
