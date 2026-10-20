import { useNavigate } from 'react-router-dom'
import type { PlannedRun } from '../../domain/marathon/plan'

/** Lancer une séance du plan : la course dans le mode séance, la muscu dans la séance sport du lot 2. */
export function useStartPlanned() {
  const navigate = useNavigate()
  return {
    run: (r: PlannedRun) => navigate('/course', { state: { day: r.day, kind: r.kind } }),
    strength: (programId: string) => navigate('/log/sport', { state: { programId } }),
  }
}
