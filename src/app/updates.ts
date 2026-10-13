/**
 * Nouvelles versions le jour même. Le service worker (registerType 'autoUpdate') prend la main dès qu'une
 * version est publiée ; on recharge alors la page, mais seulement quand ça ne fait rien perdre.
 * Ce module n'importe pas `virtual:pwa-register` (main.tsx lui passe `registerSW`) : il reste testable.
 */

/** Sous-ensemble des options de `registerSW` dont on se sert. */
export interface RegisterOptions {
  immediate?: boolean
  onNeedReload?: () => void
  onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void
}
export type Register = (options: RegisterOptions) => unknown

export const RELOADED_AT_KEY = 'motiv.reloadedAt'
const RELOAD_COOLDOWN = 60_000
const RETRY_EVERY = 2_000
const CHECK_ON_RETURN_GAP = 30 * 60_000
const CHECK_EVERY = 60 * 60_000

// Saisies non sauvegardées (log guitare, correction, fin de séance sport), écran XP qu'on vient d'ouvrir,
// fiche exo (métronome en marche, tempo joué en mémoire) : on attend que Rayan en sorte.
const BUSY_PATHS = ['/motiv/log/guitare', '/motiv/log/corriger', '/motiv/log/sport', '/motiv/xp', '/motiv/exo']

/**
 * Peut-on recharger maintenant ? `pathname` est celui de `window.location` (avec /motiv). Le chrono survit
 * au rechargement (localStorage) : seuls les écrans qui gardent quelque chose en mémoire bloquent.
 */
export function shouldReloadNow({ pathname, dialogOpen }: { pathname: string; dialogOpen: boolean }): boolean {
  if (dialogOpen) return false
  return !BUSY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** Pas deux rechargements en moins de 60 s : évite une boucle si la nouvelle version redemande à recharger. */
export function canReloadAgain(lastReloadAt: number | null, now: number): boolean {
  if (lastReloadAt === null) return true
  // Horloge reculée : le dernier rechargement est « dans le futur », on ne bloque pas indéfiniment.
  return now - lastReloadAt >= RELOAD_COOLDOWN || now < lastReloadAt
}

function lastReloadAt(): number | null {
  try {
    const v = Number(sessionStorage.getItem(RELOADED_AT_KEY))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}

function rememberReload(now: number): void {
  try {
    sessionStorage.setItem(RELOADED_AT_KEY, String(now))
  } catch {
    // stockage indisponible : pas de garde-fou, tant pis
  }
}

const isVisible = () => document.visibilityState === 'visible'

/**
 * Enregistre le service worker, vérifie s'il y a une nouvelle version au retour dans l'appli (au plus une
 * fois par 30 min) et toutes les heures, puis recharge dès que c'est sans risque.
 */
export function setupUpdates(register: Register, reload: () => void = () => window.location.reload()): void {
  let waiting: ReturnType<typeof setInterval> | undefined

  const tryReload = (): boolean => {
    const now = Date.now()
    const dialogOpen = document.querySelector('[role="dialog"]') !== null
    if (!shouldReloadNow({ pathname: window.location.pathname, dialogOpen }) || !canReloadAgain(lastReloadAt(), now)) return false
    if (waiting !== undefined) {
      clearInterval(waiting)
      waiting = undefined
      document.removeEventListener('visibilitychange', retryOnReturn)
    }
    rememberReload(now)
    reload()
    return true
  }
  const retryOnReturn = () => {
    if (isVisible()) tryReload()
  }

  const onNeedReload = () => {
    if (tryReload() || waiting !== undefined) return
    // Pas maintenant : on réessaie toutes les 2 s et à chaque retour dans l'appli.
    waiting = setInterval(tryReload, RETRY_EVERY)
    document.addEventListener('visibilitychange', retryOnReturn)
  }

  const onRegisteredSW = (_url: string, r: ServiceWorkerRegistration | undefined) => {
    if (!r) return
    let lastCheck = Date.now()
    const check = () => {
      lastCheck = Date.now()
      r.update().catch(() => {
        // hors ligne ou serveur indisponible : on réessaiera
      })
    }
    document.addEventListener('visibilitychange', () => {
      if (isVisible() && Date.now() - lastCheck >= CHECK_ON_RETURN_GAP) check()
    })
    setInterval(check, CHECK_EVERY)
  }

  register({ immediate: true, onNeedReload, onRegisteredSW })
}
