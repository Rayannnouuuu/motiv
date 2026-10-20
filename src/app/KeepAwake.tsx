import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Écrans où l'écran doit rester allumé : séance sport (entre deux séries), mode « jouer » et fiche exo
 * (lecture d'une tab). `pathname` est celui du routeur, sans /motiv.
 */
// oxlint-disable-next-line react/only-export-components -- fonction pure exportée pour les tests, comme le prévoit la spec
export function shouldKeepAwake(pathname: string): boolean {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return p === '/log/sport' || p === '/jouer' || p === '/course' || p.startsWith('/exo/') || p.startsWith('/jouer/exo/')
}

/**
 * Garde l'écran allumé (Wake Lock) sur les écrans concernés, tant que la page est visible. iOS libère le
 * verrou quand l'appli passe en arrière-plan : on le redemande au retour. Sans API (iOS < 18.4) ou en cas
 * de refus, on ne fait rien.
 */
export function KeepAwake() {
  const { pathname } = useLocation()
  const active = shouldKeepAwake(pathname)

  useEffect(() => {
    if (!active) return
    const wakeLock: WakeLock | undefined = typeof navigator === 'undefined' ? undefined : navigator.wakeLock
    if (!wakeLock) return
    let sentinel: WakeLockSentinel | null = null
    let pending = false
    let done = false

    const acquire = () => {
      if (done || pending || document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return
      pending = true
      Promise.resolve()
        .then(() => wakeLock.request('screen'))
        .then((s) => {
          if (done) void s.release().catch(() => {})
          else sentinel = s
        })
        .catch(() => {})
        .finally(() => {
          pending = false
        })
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      done = true
      document.removeEventListener('visibilitychange', onVisibility)
      if (sentinel && !sentinel.released) void sentinel.release().catch(() => {})
      sentinel = null
    }
  }, [active])

  return null
}
