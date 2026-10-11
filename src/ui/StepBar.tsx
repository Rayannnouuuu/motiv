/** Barre d'étapes des écrans de log. `current` commence à 0. */
export function StepBar({ count, current }: { count: number; current: number }) {
  return (
    <div className="flex gap-1.5" role="progressbar" aria-label="Étape" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={count}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= current ? 'bg-accent' : 'bg-surface-2'}`} />
      ))}
    </div>
  )
}
