import type { Rating } from '../../domain/types'
import { SessionFeedback } from '../../ui/SessionFeedback'

export function StepRatings(props: {
  flow: Rating | null
  desire: Rating | null
  note: string
  onFlow: (r: Rating) => void
  onDesire: (r: Rating) => void
  onNote: (s: string) => void
}) {
  return (
    <div className="flex flex-col gap-7">
      <h1 className="t-title1">Comment c'était ?</h1>
      <SessionFeedback tone="guitar" {...props} />
    </div>
  )
}
