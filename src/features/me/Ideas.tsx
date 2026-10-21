import { useState } from 'react'
import { useActions, useAppData } from '../../data/AppDataContext'
import { shortDate } from '../../domain/date'
import { Group, Row } from '../../ui/List'
import { useRun } from '../settings/useRun'

const MAX = 140

/** Parking à idées (lot 5) : noter une envie en 5 secondes, sans la lancer ; on décide au bilan de cycle. */
export function Ideas({ review = false }: { review?: boolean }) {
  const { v1 } = useAppData()
  const { saveIdea, setIdeaStatus } = useActions()
  const { busy, error, run } = useRun()
  const [text, setText] = useState('')
  const parked = (v1.profile.ideas ?? []).filter((i) => i.status === 'parked')
  if (review && parked.length === 0) return null

  const add = () => {
    if (!text.trim()) return
    void run(() => saveIdea(text)).then((ok) => ok && setText(''))
  }
  return (
    <Group
      header={review ? 'Idées en attente' : 'Idées'}
      footer={error ?? (review ? 'Lance-en une pour le prochain cycle, ou laisse-la.' : 'Note une envie sans la lancer : tu la revois au bilan de cycle.')}
    >
      {!review && (
        <form
          className="flex items-center gap-2 px-4 py-2"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX}
            placeholder="Apprendre un morceau, tester un exo…"
            aria-label="Nouvelle idée"
            className="t-body min-h-11 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
          />
          <button type="submit" disabled={busy || !text.trim()} className="hit tap t-body font-semibold text-accent disabled:opacity-35">
            Garder
          </button>
        </form>
      )}
      {parked.map((i) => (
        <Row
          key={i.id}
          title={i.text}
          detail={review ? undefined : shortDate(i.createdAt)}
          accessory={
            review ? (
              <span className="t-subhead flex shrink-0 gap-3">
                <button
                  type="button"
                  className="hit tap font-semibold text-accent"
                  disabled={busy}
                  onClick={() => void run(() => setIdeaStatus(i.id, 'promoted'))}
                >
                  Lancer
                </button>
                <button type="button" className="hit tap text-muted" disabled={busy} onClick={() => void run(() => setIdeaStatus(i.id, 'dropped'))}>
                  Laisser
                </button>
              </span>
            ) : undefined
          }
        />
      ))}
    </Group>
  )
}
