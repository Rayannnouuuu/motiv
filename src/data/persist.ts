/**
 * Sur iPhone, Safari peut effacer les données d'un site non installé après quelques jours sans visite :
 * on demande un stockage protégé, et l'appli invite à s'installer sur l'écran d'accueil.
 */
export type PersistState = 'persisted' | 'not-persisted' | 'unsupported'

export async function ensurePersisted(): Promise<PersistState> {
  const storage = typeof navigator === 'undefined' ? undefined : navigator.storage
  if (!storage?.persist || !storage.persisted) return 'unsupported'
  try {
    if (await storage.persisted()) return 'persisted'
    return (await storage.persist()) ? 'persisted' : 'not-persisted'
  } catch {
    return 'not-persisted'
  }
}

/** Ouverte depuis l'écran d'accueil (appli installée) plutôt que dans Safari. */
export function isStandalone(): boolean {
  return (
    (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}
