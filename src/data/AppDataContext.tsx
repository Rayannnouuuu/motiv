import { createContext, useContext } from 'react'
import type { Movement } from '../domain/model'
import type { AppData, BodyMetric, Day, GuitarItem, Program, Rating, Song, SportSet } from '../domain/types'
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
}

export interface SportDraft {
  id: string
  day: Day
  programId: string
  durationMin: number
  sets: SportSet[]
  flowRating: Rating
  desireRating: Rating
}

export interface Actions {
  saveGuitarSession(d: GuitarDraft): Promise<XpResult>
  saveSportSession(d: SportDraft): Promise<XpResult>
  saveBodyMetric(m: BodyMetric): Promise<void>
  saveSong(s: Song): Promise<void>
  saveProgram(p: Program): Promise<void>
  rerollChallenge(id: string): Promise<void>
  acceptEasier(id: string): Promise<void>
  deleteLog(kind: 'guitar' | 'sport', id: string): Promise<void>
  saveMovement(m: Movement): Promise<void>
}

export interface AppDataValue {
  data: AppData
  /** Bibliothèque sport (modèle v1, déjà lu tel quel par la Bibliothèque). */
  movements: Movement[]
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
