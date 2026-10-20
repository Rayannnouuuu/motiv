import type { ReactNode } from 'react'

/**
 * Icônes au trait de MOTIV : grille de 24, trait de 1,8 partout, bouts et angles arrondis, couleur du texte
 * (currentColor). Toujours décoratives (aria-hidden) : le libellé du bouton ou du texte voisin dit ce qu'elles
 * représentent. Pas de flamme : le logo l'a remplacée.
 */
const PATHS = {
  // Onglets
  today: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <path d="M11 14.5h2v2h-2z" />
    </>
  ),
  progress: (
    <>
      <path d="m3.5 17 5.5-5.5 4 4 7.5-7.5" />
      <path d="M15 8h5.5v5.5" />
    </>
  ),
  library: (
    <>
      <rect x="3.5" y="4" width="4" height="16.5" rx="1.2" />
      <rect x="9" y="4" width="4" height="16.5" rx="1.2" />
      <rect x="15" y="4.5" width="4" height="16" rx="1.2" transform="rotate(-15 17 12.5)" />
    </>
  ),
  me: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c.8-4 3.8-6.3 7.5-6.3s6.7 2.3 7.5 6.3" />
    </>
  ),
  // Disciplines
  guitar: (
    <>
      <path d="M13.2 10.8 19 5" />
      <path d="m18 3.5 2.5 2.5M19.7 2.6l1.7 1.7" />
      <path d="M11.4 8.9a3.4 3.4 0 0 0-4.6.3 2.1 2.1 0 0 1-1.3.7 3.5 3.5 0 0 0-2.2 1.1 4.6 4.6 0 0 0 .2 6.4l1.1 1.1a4.6 4.6 0 0 0 6.4.2 3.5 3.5 0 0 0 1.1-2.2 2.1 2.1 0 0 1 .7-1.3 3.4 3.4 0 0 0 .3-4.6" />
      <path d="m7.5 13.5 3 3" />
    </>
  ),
  sport: (
    <>
      <path d="M8 12h8" />
      <rect x="4.5" y="7" width="3.5" height="10" rx="1.2" />
      <rect x="16" y="7" width="3.5" height="10" rx="1.2" />
      <path d="M2.5 10v4M21.5 10v4" />
    </>
  ),
  // Contenu
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  song: (
    <>
      <path d="M9 17.5V6l11-2.5V15" />
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="15" r="2.5" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 13.5V10M10 2.5h4M12 2.5V6M18.5 6.5 20 5" />
    </>
  ),
  trophy: (
    <>
      <path d="M7.5 4h9v6a4.5 4.5 0 0 1-9 0V4Z" />
      <path d="M7.5 6.5H5.5a2 2 0 0 0 0 4h2.3M16.5 6.5h2a2 2 0 0 1 0 4h-2.3" />
      <path d="M12 14.5v3.5M8.5 20.5h7" />
    </>
  ),
  // Actions
  play: <path d="M7.5 5.2v13.6a1 1 0 0 0 1.5.8l10.8-6.8a1 1 0 0 0 0-1.6L9 4.4a1 1 0 0 0-1.5.8Z" />,
  pause: <path d="M8.5 5v14M15.5 5v14" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  chevron: <path d="m9 5.5 6.5 6.5L9 18.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4.5 4.5" />
    </>
  ),
  export: (
    <>
      <path d="M12 3.5V15M7.5 8 12 3.5 16.5 8" />
      <path d="M5 12.5v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </>
  ),
  import: (
    <>
      <path d="M12 3.5V15M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

/**
 * Taille par défaut : 1,25 fois le texte autour (elle suit la taille de texte du téléphone).
 * `className` règle la couleur (text-…), la taille (size-…) ou l'orientation (rotate-… pour le chevron).
 */
export function Icon({ name, size = '1.25em', className = '' }: { name: IconName; size?: number | string; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      data-icon={name}
      // Dans un texte, l'icône se centre sur les capitales ; dans un flex, l'alignement du parent l'emporte.
      className={`inline-block shrink-0 align-[-0.25em] ${className}`}
    >
      {PATHS[name]}
    </svg>
  )
}
