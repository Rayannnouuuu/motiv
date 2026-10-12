import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { levelUps, snapshot } from '../../domain/levelUp'
import { allLevels } from '../../domain/levels'
import { LevelUpOverlay, type LevelUpInfo } from './LevelUpOverlay'
import { loadSeen, saveSeen } from './seenLevels'

const DELAY_MS = 1200 // laisse voir l'écran « +N XP » et ses petits feux d'artifice d'abord

/** Affiche l'animation de montée de niveau une fois par niveau gagné (hors écrans de saisie). */
export function LevelUpWatcher() {
  const { data, loading } = useAppData()
  const { pathname } = useLocation()
  const [info, setInfo] = useState<LevelUpInfo | null>(null)
  const now = snapshot(allLevels(data))
  const key = `${now.global}/${now.guitar}/${now.sport}`

  useEffect(() => {
    if (loading || info || pathname.startsWith('/log')) return
    const seen = loadSeen()
    // Premier passage sur cet appareil : on part des niveaux actuels, sans fête.
    if (!seen) return saveSeen(now)
    const ups = levelUps(seen, now)
    if (ups.length === 0) {
      // Niveau en baisse (log supprimé) : on se recale pour fêter la prochaine vraie montée.
      if (key !== `${seen.global}/${seen.guitar}/${seen.sport}`) saveSeen(now)
      return
    }
    const t = window.setTimeout(
      () => setInfo({ key: ups[0], from: seen[ups[0]], to: now[ups[0]], also: ups.slice(1).map((k) => ({ key: k, to: now[k] })) }),
      DELAY_MS,
    )
    return () => clearTimeout(t)
    // `now` est décrit par `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, loading, pathname, info])

  if (!info) return null
  return (
    <LevelUpOverlay
      info={info}
      onClose={() => {
        saveSeen(now)
        setInfo(null)
      }}
    />
  )
}
