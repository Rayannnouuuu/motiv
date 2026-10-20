import type { LevelSnapshot } from '../../domain/levelUp'
import { storageKey } from '../../data/db'

const KEY = storageKey('seenLevels.v1')

/** Derniers niveaux montrés sur cet appareil (pour ne fêter chaque niveau qu'une fois). */
export function loadSeen(): LevelSnapshot | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<LevelSnapshot> | null
    return v && typeof v.global === 'number' && typeof v.guitar === 'number' && typeof v.sport === 'number' ? (v as LevelSnapshot) : null
  } catch {
    return null
  }
}

export function saveSeen(s: LevelSnapshot): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // stockage indisponible : l'animation pourra revenir, sans gravité
  }
}
