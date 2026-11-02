/**
 * Moduler ses journées (lot 20) : ce qui est prévu un jour = le plan (sorties, muscu) + ce que tu y as ajouté, moins
 * ce que tu en as retiré. Déplacer une séance = la retirer d'un jour et l'ajouter à l'autre. Pur : rien d'enregistré ici.
 */
import { addDays } from './date'
import { plannedOn, type Plan, type RunKind } from './marathon/plan'
import { runOf } from './marathon/runs'
import type { Session } from './model'
import type { Day } from './types'

export type PlannedItem =
  { kind: 'strength'; programId: string; name?: string; light?: boolean } | { kind: 'run'; runKind: RunKind; km: number } | { kind: 'guitar' }

export interface AddedSession {
  id: string
  day: Day
  item: PlannedItem
}

/** Ce que tu as changé au plan : séances ajoutées, et séances du plan retirées d'un jour (`jour|clé`). */
export interface PlanEdits {
  added: AddedSession[]
  hidden: string[]
}

export const EMPTY_EDITS: PlanEdits = { added: [], hidden: [] }

/** Une séance d'un jour, du plan ou ajoutée. */
export interface DayItem {
  day: Day
  /** Identifie la séance dans le jour : `run-long`, `muscu-<modèle>`, `guitar`, ou `added-<id>`. */
  key: string
  item: PlannedItem
  /** Définie pour une séance ajoutée. */
  addedId?: string
  done: boolean
}

export const planKey = (item: PlannedItem): string =>
  item.kind === 'run' ? `run-${item.runKind}` : item.kind === 'strength' ? `muscu-${item.programId}` : 'guitar'

const hiddenKey = (day: Day, key: string) => `${day}|${key}`
export const isHidden = (e: PlanEdits, day: Day, key: string) => e.hidden.includes(hiddenKey(day, key))

interface Ctx {
  plan: Plan | null
  edits: PlanEdits
  sessions: Session[]
}

/** Les séances d'un jour, faites ou non. Les sorties de vélo/marche (`cross`) restent au plan sans compter comme manquées. */
export function itemsOn(day: Day, { plan, edits, sessions }: Ctx): DayItem[] {
  const mine = sessions.filter((s) => s.day === day)
  const ran = mine.some((s) => s.discipline === 'sport' && runOf(s))
  const lifted = mine.some((s) => s.discipline === 'sport' && !runOf(s))
  const played = mine.some((s) => s.discipline === 'guitar')
  const doneOf = (i: PlannedItem) => (i.kind === 'run' ? ran : i.kind === 'strength' ? lifted : played)
  const planned = plan ? plannedOn(plan, day) : { runs: [], strength: [] }
  const out: DayItem[] = []
  for (const r of planned.runs) {
    const item: PlannedItem = { kind: 'run', runKind: r.kind, km: r.km }
    const key = planKey(item)
    if (!isHidden(edits, day, key)) out.push({ day, key, item, done: ran })
  }
  for (const s of planned.strength) {
    const item: PlannedItem = { kind: 'strength', programId: s.programId, name: s.name, light: s.light }
    const key = planKey(item)
    if (!isHidden(edits, day, key)) out.push({ day, key, item, done: lifted })
  }
  for (const a of edits.added.filter((x) => x.day === day)) out.push({ day, key: `added-${a.id}`, item: a.item, addedId: a.id, done: doneOf(a.item) })
  return out
}

/** Les séances prévues dans les derniers jours et pas faites (hier, avant-hier…), pour les rattraper. */
export function missedBefore(today: Day, ctx: Ctx, days = 3): DayItem[] {
  const out: DayItem[] = []
  for (let n = days; n >= 1; n--)
    for (const i of itemsOn(addDays(today, -n), ctx))
      if (!i.done && !(i.item.kind === 'run' && (i.item.runKind === 'cross' || i.item.runKind === 'race'))) out.push(i)
  return out
}

export function addSession(e: PlanEdits, day: Day, item: PlannedItem, id: string): PlanEdits {
  return { ...e, added: [...e.added, { id, day, item }] }
}

/** Retire une séance d'un jour : une séance ajoutée est supprimée, une séance du plan est masquée ce jour-là. */
export function removeItem(e: PlanEdits, i: DayItem): PlanEdits {
  if (i.addedId) return { ...e, added: e.added.filter((a) => a.id !== i.addedId) }
  return e.hidden.includes(hiddenKey(i.day, i.key)) ? e : { ...e, hidden: [...e.hidden, hiddenKey(i.day, i.key)] }
}

/** Déplace une séance vers un autre jour (la même séance, ailleurs). */
export function moveItem(e: PlanEdits, i: DayItem, toDay: Day, id: string): PlanEdits {
  if (toDay === i.day) return e
  if (i.addedId) return { ...e, added: e.added.map((a) => (a.id === i.addedId ? { ...a, day: toDay } : a)) }
  return addSession(removeItem(e, i), toDay, i.item, id)
}

/** On ne garde pas plus de deux semaines de passé : au-delà, rien n'est plus à rattraper. */
export function prune(e: PlanEdits, today: Day): PlanEdits {
  const limit = addDays(today, -14)
  return { added: e.added.filter((a) => a.day >= limit), hidden: e.hidden.filter((h) => h.slice(0, 10) >= limit) }
}
