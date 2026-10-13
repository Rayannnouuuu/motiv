import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { shouldReloadNow } from './updates'

/** Chemin de l'appli (sans /motiv) d'une adresse envoyée par le service worker. */
function appPath(url: string): string {
  return new URL(url, location.origin).pathname.replace(/^\/motiv(?=\/|$)/, '') || '/'
}

/**
 * Rappel touché alors que l'appli est déjà ouverte : le service worker la ramène devant et nous envoie
 * l'écran visé. On y va seulement si rien n'est en cours de saisie (mêmes écrans que pour une mise à jour).
 */
export function NotificationLinks() {
  const navigate = useNavigate()
  useEffect(() => {
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined
    if (!sw) return
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: unknown; url?: unknown } | null
      if (d?.type !== 'motiv:open' || typeof d.url !== 'string') return
      const dialogOpen = document.querySelector('[role="dialog"]') !== null
      if (!shouldReloadNow({ pathname: location.pathname, dialogOpen })) return
      navigate(appPath(d.url))
    }
    sw.addEventListener('message', onMessage)
    return () => sw.removeEventListener('message', onMessage)
  }, [navigate])
  return null
}
