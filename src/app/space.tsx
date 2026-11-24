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

/** Couleurs fixes des cartes de l'écran d'ouverture : dégradé de la couleur de l'espace et halo. */
const CARD: Record<Space, string> = {
  sport: 'bg-gradient-to-b from-[#7dbcff] to-[#3d8ef0] shadow-[0_12px_40px_-12px_rgba(90,169,255,0.7)]',
  guitar: 'bg-gradient-to-b from-[#f7bd62] to-[#e08a1e] shadow-[0_12px_40px_-12px_rgba(242,163,58,0.7)]',
}
const HINT: Record<Space, string> = { sport: 'Course · Muscu', guitar: 'Accords · Morceaux' }

/**
 * L'écran d'ouverture : fond noir, deux cartes. Couleurs fixes (celles du thème sombre), quel que soit
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
      <p className="t-overline animate-fade tracking-[0.3em] text-white/50">MOTIV</p>
      {/* Deux cartes en portrait, côte à côte, bien séparées. */}
      <div className="grid w-full max-w-[18rem] grid-cols-2 gap-6">
        {(['sport', 'guitar'] as const).map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => go(s)}
            aria-label={LABEL[s]}
            aria-describedby={`space-hint-${s}`}
            style={{ animationDelay: `${80 + i * 70}ms` }}
            className={`tap-scale animate-rise relative flex aspect-[3/4] flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl text-[#0f1012] ring-1 ring-white/25 ring-inset ${CARD[s]}`}
          >
            {/* Reflet en haut de la carte. */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
            <span className="relative grid size-14 place-items-center rounded-full bg-black/15">
              <Icon name={s} size={28} />
            </span>
            <span className="relative flex flex-col items-center gap-0.5">
              <span className="font-display text-xl leading-none font-bold tracking-tight">{LABEL[s]}</span>
              <span id={`space-hint-${s}`} className="text-xs font-medium text-[#0f1012]/70">
                {HINT[s]}
              </span>
            </span>
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
