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
      className={`hit h-7.75 w-12.75 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${checked ? 'bg-accent' : 'bg-fill-strong'}`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 left-0.5 size-6.75 rounded-full shadow-thumb ${checked ? 'bg-on-accent' : 'bg-white'} transition-transform duration-500 ease-bounce`}
        style={{ transform: `translateX(${checked ? 'calc(var(--spacing) * 5)' : '0'})` }}
      />
    </button>
  )
}
