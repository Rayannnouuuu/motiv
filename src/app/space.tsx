import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../design/icons'
import type { Domain } from '../domain/types'

/** Les deux espaces de l'appli (lot 26) : on entre dans l'un ou l'autre, chacun avec ses onglets. */
export type Space = Domain

const KEY = 'motiv.space.v1'

interface SpaceValue {
  /** L'espace en cours ; null : tout est montré (hors appli, dans les tests d'un écran seul). */
  space: Space | null
  /** Aucun espace choisi depuis l'ouverture : l'écran de choix s'affiche. */
  choosing: boolean
  choose: (s: Space) => void
}

const SpaceContext = createContext<SpaceValue>({ space: null, choosing: false, choose: () => {} })

export const useSpace = () => useContext(SpaceContext)

/** Ce qui appartient à un univers se montre dans son espace (ou partout, sans espace). */
export const inSpace = (space: Space | null, domain: Domain) => space === null || space === domain

const read = (): Space | null => {
  try {
    const v = sessionStorage.getItem(KEY)
    return v === 'sport' || v === 'guitar' ? v : null
  } catch {
    return null
  }
}

/**
 * L'espace choisi vit le temps de l'ouverture : l'appli fermée puis rouverte redemande Sport ou Guitare ;
 * un rechargement (nouvelle version) garde le choix.
 */
export function SpaceProvider({ children, initial }: { children: ReactNode; initial?: Space }) {
  const [space, setSpace] = useState<Space | null>(() => initial ?? read())
  const choose = useCallback((s: Space) => {
    try {
      sessionStorage.setItem(KEY, s)
    } catch {
      // stockage indisponible : le choix tient jusqu'au rechargement
    }
    setSpace(s)
  }, [])
  return <SpaceContext.Provider value={{ space, choosing: space === null, choose }}>{children}</SpaceContext.Provider>
}

const LABEL: Record<Space, string> = { sport: 'Sport', guitar: 'Guitare' }

/**
 * L'écran d'ouverture : fond noir, deux grands boutons. Couleurs fixes (celles du thème sombre), quel que soit
 * le thème choisi : l'écran reste noir.
 */
export function SpaceChooser() {
  const { choose } = useSpace()
  const navigate = useNavigate()
  const go = (s: Space) => {
    choose(s)
    navigate('/', { replace: true })
  }
  return (
    <div
      role="dialog"
      aria-label="Choisir un espace"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-black px-5 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-white"
    >
      <p className="t-overline tracking-[0.3em] text-white/60">MOTIV</p>
      {/* Deux cartes en portrait, côte à côte. */}
      <div className="grid w-full max-w-[16rem] grid-cols-2 gap-3">
        {(['sport', 'guitar'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => go(s)}
            className={`tap-scale flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-2xl ${
              s === 'sport' ? 'bg-[#5aa9ff] text-[#0f1012]' : 'bg-[#f2a33a] text-[#0f1012]'
            }`}
          >
            <Icon name={s} size={28} />
            <span className="font-display text-xl font-bold tracking-tight">{LABEL[s]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** En haut des écrans d'un espace : passer à l'autre en un toucher. */
export function SpaceSwitch() {
  const { space, choose } = useSpace()
  const navigate = useNavigate()
  if (space === null) return null
  const other: Space = space === 'sport' ? 'guitar' : 'sport'
  return (
    <button
      type="button"
      aria-label={`Passer à l'espace ${LABEL[other]}`}
      onClick={() => {
        choose(other)
        navigate('/')
      }}
      className={`hit tap t-subhead flex min-h-11 items-center gap-1.5 font-semibold ${other === 'sport' ? 'text-sport' : 'text-guitar'}`}
    >
      <span aria-hidden className="text-muted">
        ⇄
      </span>
      <Icon name={other} />
      {LABEL[other]}
    </button>
  )
}
