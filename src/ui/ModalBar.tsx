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
  return (
    <div className="sticky top-0 z-10 -mx-4 mb-2 grid h-11 grid-cols-[1fr_auto_1fr] items-center bg-bg/0 px-4">
      <button type="button" aria-label={cancelAria} onClick={onCancel} className="tap t-body justify-self-start py-2 text-accent">
        {cancelLabel}
      </button>
      <p className="t-headline truncate text-center">{title}</p>
      <div className="justify-self-end">{trailing}</div>
    </div>
  )
}
