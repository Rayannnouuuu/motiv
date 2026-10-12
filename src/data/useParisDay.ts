import { useEffect, useState } from 'react'
import { msUntilNextParisMidnight, todayParis } from '../domain/date'
import type { Day } from '../domain/types'

const MAX_WAIT_MS = 3_600_000 // plafond d'1 h : absorbe les changements d'heure et les minuteurs retardés

/**
 * Jour de Paris, tenu à jour : à minuit et au retour de l'appli au premier plan.
 * iOS reprend souvent l'appli restée en mémoire : sans ça, « aujourd'hui » resterait la veille.
 */
export function useParisDay(): Day {
  const [day, setDay] = useState(todayParis)

  useEffect(() => {
    // React ignore la mise à jour quand le jour n'a pas changé.
    const check = () => setDay(todayParis())
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check()
    }

    let timer: ReturnType<typeof setTimeout>
    const arm = () => {
      timer = setTimeout(
        () => {
          check()
          arm()
        },
        Math.min(msUntilNextParisMidnight(new Date()) + 1000, MAX_WAIT_MS),
      )
    }
    arm()

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', check)
    window.addEventListener('focus', check)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', check)
      window.removeEventListener('focus', check)
    }
  }, [])

  return day
}
