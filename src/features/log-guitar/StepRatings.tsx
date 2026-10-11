import type { Rating } from '../../domain/types'
import { RatingPicker } from '../../ui/RatingPicker'

export function StepRatings({ flow, desire, onFlow, onDesire }: {
  flow: Rating | null
  desire: Rating | null
  onFlow: (r: Rating) => void
  onDesire: (r: Rating) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Comment c'était ?</h1>
      <RatingPicker label="Temps oublié" value={flow} onChange={onFlow} />
      <RatingPicker label="Envie d'y retourner" value={desire} onChange={onDesire} />
    </div>
  )
}
