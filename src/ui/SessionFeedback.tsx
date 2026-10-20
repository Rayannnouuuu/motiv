import type { Tone } from '../design/tone'
import type { Rating } from '../domain/types'
import { RatingPicker } from './RatingPicker'

export const NOTE_MAX = 500

/**
 * Fin de séance, commune à la guitare, au sport, au log rapide et à la correction : les deux notes de 1 à 5,
 * puis une note libre facultative.
 */
export function SessionFeedback({
  tone,
  flow,
  desire,
  note,
  onFlow,
  onDesire,
  onNote,
}: {
  tone: Tone
  flow: Rating | null
  desire: Rating | null
  note: string
  onFlow: (r: Rating) => void
  onDesire: (r: Rating) => void
  onNote: (s: string) => void
}) {
  return (
    <>
      <RatingPicker tone={tone} label="Temps oublié" hint="As-tu perdu la notion du temps ?" value={flow} onChange={onFlow} />
      <RatingPicker tone={tone} label="Envie d'y retourner" hint="As-tu hâte de rejouer ?" value={desire} onChange={onDesire} />
      <label className="flex flex-col gap-2">
        <span className="t-headline">
          Note <span className="t-subhead font-normal text-muted">(facultatif)</span>
        </span>
        <textarea
          value={note}
          onChange={(e) => onNote(e.target.value)}
          maxLength={NOTE_MAX}
          rows={3}
          placeholder="Ce qui a marché, ce qui coince…"
          className="t-body resize-none rounded-md bg-surface px-4 py-3 outline-none placeholder:text-muted"
        />
      </label>
    </>
  )
}

/** Note libre à enregistrer : sans espaces autour, absente si vide. */
export const noteOf = (s: string) => (s.trim() ? { note: s.trim() } : {})
