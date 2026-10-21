import { storageKey } from '../../data/db'

/** « Plus tard » sur ce téléphone seulement : une carte masquée jusqu'à une date (confort, pas une donnée). */
const KEY = storageKey('later.v1')

function read(): Record<string, string> {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string>) ?? {}
  } catch {
    return {}
  }
}

export const hiddenUntil = (key: string): string | null => read()[key] ?? null

export function hideUntil(key: string, day: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), [key]: day }))
  } catch {
    // Stockage indisponible (navigation privée) : la carte reviendra, rien de grave.
  }
}
