import type { ReactNode } from 'react'

/**
 * Barre d'un écran présenté par-dessus (saisie) : « Annuler » à gauche comme partout sur iPhone,
 * titre au centre, action éventuelle à droite.
 */
export function ModalBar({ title, onCancel, cancelLabel = 'Annuler', cancelAria, trailing }: {
  title?: ReactNode
  onCancel: () => void
  cancelLabel?: string
  cancelAria?: string
  trailing?: ReactNode
}) {
  // Opaque et collée en haut (zone de l'heure comprise) : le contenu défile dessous sans s'y mêler,
  // et un toucher sur le haut de l'écran ne tombe pas par erreur sur « Annuler ».
  return (
    <div className="sticky top-0 z-10 -mx-4 -mt-[env(safe-area-inset-top)] mb-2 box-content grid h-11 grid-cols-[1fr_auto_1fr] items-center bg-bg px-4 pt-[env(safe-area-inset-top)]">
      <button type="button" aria-label={cancelAria} onClick={onCancel} className="tap t-body justify-self-start py-2 whitespace-nowrap text-accent">
        {cancelLabel}
      </button>
      <p className="t-headline truncate text-center">{title}</p>
      <div className="justify-self-end">{trailing}</div>
    </div>
  )
}
