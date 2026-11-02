import type { PlannedItem } from '../../domain/dayItems'
import { RUN_LABELS } from '../../domain/marathon/plan'
import { km } from '../marathon/format'

/** « Sortie longue 15 km », « Pull léger », « Guitare » : le nom d'une séance prévue. */
export function itemLabel(i: PlannedItem, programName: (id: string) => string | undefined): string {
  if (i.kind === 'guitar') return 'Guitare'
  if (i.kind === 'strength') return `${programName(i.programId) ?? i.name ?? 'Muscu'}${i.light ? ' léger' : ''}`
  return `${RUN_LABELS[i.runKind]}${i.km > 0 ? ` ${km(i.km)}` : ''}`
}
