import { createContext, useContext } from 'react'
import type { Chrono, MarathonProfile } from '../domain/marathon/profile'
import type { Checkin, DataV1, GuitarState, Idea, Proof, SongStatus } from '../domain/model'
import type { ImportedRun } from '../domain/stravaImport'
import type { WeeklyReview } from '../domain/weeklyReview'
import type { AppData, BodyMetric, ChallengeTarget, Day, Domain, GuitarItem, Program, Rating, Song, SportSet } from '../domain/types'
import type { XpResult } from '../domain/xp'
import type { MotivDb } from './db'

export interface GuitarDraft {
  id: string
  day: Day
  durationMin: number
  items: GuitarItem[]
  newSongs: Song[]
  flowRating: Rating
  desireRating: Rating
  note?: string
}

export interface SportDraft {
  id: string
  day: Day
  programId: string
  durationMin: number
  sets: SportSet[]
  flowRating: Rating
  desireRating: Rating
  note?: string
}

/** Une sortie de course, notée en fin de séance (lot 3). */
export interface RunDraft {
  id: string
  day: Day
  durationMin: number
  km: number
  sec: number
  /** Douleur de 0 à 10. */
  pain: number
  flowRating: Rating
  desireRating: Rating
  note?: string
}

export interface Actions {
  saveGuitarSession(d: GuitarDraft): Promise<XpResult>
  saveSportSession(d: SportDraft): Promise<XpResult>
  saveBodyMetric(m: BodyMetric): Promise<void>
  saveSong(s: Song): Promise<void>
  /** Statut du répertoire (à apprendre, en cours, maîtrisé, à entretenir). */
  setSongStatus(id: string, status: SongStatus): Promise<void>
  /** Ta tablature d'un morceau (texte vide : elle est effacée). */
  setSongTab(id: string, tab: string): Promise<void>
  saveProgram(p: Program): Promise<void>
  rerollChallenge(id: string): Promise<void>
  acceptEasier(id: string): Promise<void>
  /** Lance un cycle de 6 semaines avec ses deux objectifs phares (les objectifs encore ouverts sont remplacés). */
  startCycle(targets: Record<Domain, ChallengeTarget>): Promise<void>
  /** Bilan de fin du dernier cycle : ce que je garde. */
  saveCycleReview(keep: string): Promise<void>
  /** Bilan du dimanche : remplace celui de la même semaine s'il existe. */
  saveWeeklyReview(r: WeeklyReview): Promise<void>
  deleteLog(kind: 'guitar' | 'sport', id: string): Promise<void>
  saveMovement(m: DataV1['exercises'][number]): Promise<void>
  /** Profil marathon ; crée ou met à jour le modèle « Renfo coureur ». */
  saveMarathon(m: MarathonProfile): Promise<void>
  /** Une sortie ; un chrono battu devient la référence (`chrono` dans le résultat). */
  saveRun(d: RunDraft): Promise<XpResult & { chrono: Chrono | null }>
  /** Semaine déclarée « malade » (lundi), ou plus. */
  setSickWeek(monday: Day, sick: boolean): Promise<void>
  /** Un jour où tu n'es pas disponible (plan marathon + muscu) : le plan se recalcule sans lui. */
  setOffDay(day: Day, off: boolean): Promise<void>
  /** Preuve audio ou photo (lot 5) : la fiche et son fichier, écrits ensemble. */
  saveProof(p: Proof, bytes: ArrayBuffer): Promise<void>
  deleteProof(id: string): Promise<void>
  /** Parking à idées : noter sans lancer. */
  saveIdea(text: string): Promise<void>
  setIdeaStatus(id: string, status: Idea['status']): Promise<void>
  /** Check-in du matin : remplace celui du même jour. */
  saveCheckin(c: Checkin): Promise<void>
  setMorningCheckin(on: boolean): Promise<void>
  /** Parcours guitare : progression par compétence et focus de la semaine (remplace l'état précédent). */
  saveGuitarState(g: GuitarState): Promise<void>
  /** Courses importées d'un fichier Strava (déjà dédoublonnées), en une seule écriture. Renvoie l'XP gagnée. */
  importRuns(runs: ImportedRun[]): Promise<number>
}

export interface AppDataValue {
  data: AppData
  /** Les mêmes données au modèle v1 (bibliothèque sport, historique par mouvement, tempos propres). */
  v1: DataV1
  today: Day
}

export const AppDataContext = createContext<AppDataValue | null>(null)
export const ActionsContext = createContext<Actions | null>(null)
export const DbContext = createContext<MotivDb | null>(null)

export function useAppData(): AppDataValue {
  const v = useContext(AppDataContext)
  if (!v) throw new Error('useAppData hors de AppDataProvider')
  return v
}

export function useActions(): Actions {
  const v = useContext(ActionsContext)
  if (!v) throw new Error('useActions hors de AppDataProvider')
  return v
}

/** La base locale, pour la sauvegarde et l'import. */
export function useDb(): MotivDb {
  const v = useContext(DbContext)
  if (!v) throw new Error('useDb hors de DbContext')
  return v
}
