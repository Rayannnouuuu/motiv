/** Le dessin de l'interrupteur (piste et pastille), sans zone tactile : pour un bouton qui le contient. */
export function SwitchTrack({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative block h-7.75 w-12.75 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-accent' : 'bg-fill-strong'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-6.75 rounded-full shadow-thumb ${checked ? 'bg-on-accent' : 'bg-white'} transition-transform duration-500 ease-bounce`}
        style={{ transform: `translateX(${checked ? 'calc(var(--spacing) * 5)' : '0'})` }}
      />
    </span>
  )
}

/** Interrupteur iOS : la pastille glisse avec un ressort, le fond prend l'accent (réglage global, neutre) et la pastille son texte. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="hit shrink-0 rounded-full disabled:opacity-40"
    >
      <SwitchTrack checked={checked} />
    </button>
  )
}

/** Ligne d'interrupteur : toute la ligne est l'interrupteur (titre, détail et piste se touchent d'un seul geste). */
export function SwitchRow({
  title,
  subtitle,
  checked,
  onChange,
  disabled,
}: {
  title: string
  subtitle?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="tap-row flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left disabled:opacity-40"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="t-body">{title}</span>
        {subtitle && <span className="t-subhead text-muted">{subtitle}</span>}
      </span>
      <SwitchTrack checked={checked} />
    </button>
  )
}
