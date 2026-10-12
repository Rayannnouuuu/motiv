import type { Rating } from '../../domain/types'
import { RatingPicker } from '../../ui/RatingPicker'

export function StepRatings({ flow, desire, onFlow, onDesire }: {
  flow: Rating | null
  desire: Rating | null
  onFlow: (r: Rating) => void
  onDesire: (r: Rating) => void
}) {
  return (
    <div className="flex flex-col gap-7">
      <h1 className="t-title1">Comment c'était ?</h1>
      <RatingPicker label="Temps oublié" hint="As-tu perdu la notion du temps ?" value={flow} onChange={onFlow} />
      <RatingPicker label="Envie d'y retourner" hint="As-tu hâte de rejouer ?" value={desire} onChange={onDesire} />
    </div>
  )
}
