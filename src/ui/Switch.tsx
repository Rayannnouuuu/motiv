/** Interrupteur iOS : la pastille glisse avec un ressort, le fond passe au vert. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[1.9375rem] w-[3.1875rem] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${checked ? 'bg-guitar' : 'bg-fill-strong'}`}
    >
      <span
        aria-hidden
        className="absolute top-0.5 left-0.5 h-[1.6875rem] w-[1.6875rem] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_3px_1px_rgb(0_0_0/0.06)] transition-transform duration-500 ease-bounce"
        style={{ transform: `translateX(${checked ? '1.25rem' : '0'})` }}
      />
    </button>
  )
}
