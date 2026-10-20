import { TONE, type Tone } from '../design/tone'

/** Avancement des écrans de log : des points, l'étape en cours s'allonge. `current` commence à 0. */
export function StepBar({ count, current, tone }: { count: number; current: number; tone: Tone }) {
  return (
    <div className="flex items-center justify-center gap-1.5" role="progressbar" aria-label="Étape" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={count}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`h-2 rounded-full transition-[width,background-color] duration-500 ease-spring ${i === current ? `w-6 ${TONE.bg[tone]}` : i < current ? `w-2 ${TONE.bg[tone]}` : 'w-2 bg-fill-strong'}`}
        />
      ))}
    </div>
  )
}
