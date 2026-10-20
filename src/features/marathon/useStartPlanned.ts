import { useNavigate } from 'react-router-dom'
import type { PlannedRun } from '../../domain/marathon/plan'
import { RUNNER_TEMPLATE_ID } from '../../domain/marathon/strength'

/** Lancer une séance du plan : la course dans le mode séance, le renfo dans la séance sport du lot 2. */
export function useStartPlanned() {
  const navigate = useNavigate()
  return {
    run: (r: PlannedRun) => navigate('/course', { state: { day: r.day, kind: r.kind } }),
    strength: () => navigate('/log/sport', { state: { programId: RUNNER_TEMPLATE_ID } }),
  }
}
