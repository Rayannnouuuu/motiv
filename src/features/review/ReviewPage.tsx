import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActions, useAppData } from '../../data/AppDataContext'
import { addDays, shortDate, weekStart } from '../../domain/date'
import { weekGoals } from '../../domain/streak'
import { REVIEW_MAX, reviewDue } from '../../domain/weeklyReview'
import { Button } from '../../ui/Button'
import { ModalBar } from '../../ui/ModalBar'
import { useRun } from '../settings/useRun'
import { useSportGoalOf } from '../week/useRhythm'

const QUESTIONS = [
  { key: 'worked', label: 'Ce qui a marché', placeholder: 'Un exo, un horaire, une séance…' },
  { key: 'blocked', label: 'Ce qui a bloqué', placeholder: 'Fatigue, manque de temps, une douleur…' },
  { key: 'focus', label: 'Le focus de la semaine prochaine', placeholder: 'Une seule chose' },
] as const

type Answers = Record<(typeof QUESTIONS)[number]['key'], string>

/** Bilan du dimanche (lot 4) : la semaine en chiffres, puis 3 questions, 2 minutes. */
export function ReviewPage() {
  const { data, v1, today } = useAppData()
  const { saveWeeklyReview } = useActions()
  const navigate = useNavigate()
  const sportGoalOf = useSportGoalOf()
  const { busy, error, run } = useRun()
  // La semaine due (dimanche, ou lundi en rattrapage) ; sinon celle du dernier bilan (son focus se modifie), sinon celle en cours.
  const [week] = useState(() => {
    const last = addDays(weekStart(today), -7)
    return reviewDue(v1.profile.reviews, today) ?? (v1.profile.reviews?.some((r) => r.week === last) ? last : weekStart(today))
  })
  const before = v1.profile.reviews?.find((r) => r.week === week)
  const [answers, setAnswers] = useState<Answers>({ worked: before?.worked ?? '', blocked: before?.blocked ?? '', focus: before?.focus ?? '' })
  const goals = weekGoals(data, week, sportGoalOf(week))

  return (
    <div className="flex flex-1 flex-col gap-5">
      <ModalBar onCancel={() => navigate(-1)} cancelLabel="Annuler" title="Bilan de la semaine" />
      <div>
        <p className="t-overline text-muted">
          Semaine du {shortDate(week)} au {shortDate(addDays(week, 6))}
        </p>
        <h1 className="t-title1 mt-1">2 minutes pour ta semaine</h1>
      </div>
      <p className="t-subhead rounded-xl border border-line bg-surface px-4 py-3 tabular-nums">
        Guitare {goals.guitar.done}/{goals.guitar.goal} · Sport {goals.sport.done}/{goals.sport.goal}
      </p>
      {QUESTIONS.map((q) => (
        <label key={q.key} className="flex flex-col gap-1.5">
          <span className="t-headline">{q.label}</span>
          <textarea
            value={answers[q.key]}
            onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })}
            maxLength={REVIEW_MAX}
            rows={2}
            placeholder={q.placeholder}
            className="t-body resize-none rounded-md border border-line bg-surface px-4 py-3 outline-none placeholder:text-muted"
          />
        </label>
      ))}
      {error && (
        <p role="alert" className="t-footnote text-danger">
          {error}
        </p>
      )}
      <Button
        className="mt-auto"
        disabled={busy}
        onClick={() =>
          void run(() => saveWeeklyReview({ week, ...answers, at: today })).then((ok) => {
            if (ok) navigate('/', { replace: true })
          })
        }
      >
        Enregistrer le bilan
      </Button>
    </div>
  )
}
