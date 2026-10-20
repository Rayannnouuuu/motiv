import type { ReactNode } from 'react'
import { Icon } from '../design/icons'
import { TONE, type Tone } from '../design/tone'

/**
 * Barre d'un écran présenté par-dessus (saisie) : « Annuler » à gauche comme partout sur iPhone,
 * titre au centre, action éventuelle à droite.
 */
export function ModalBar({
  title,
  onCancel,
  cancelLabel = 'Annuler',
  cancelAria,
  trailing,
  tone = 'accent',
  back = false,
}: {
  title?: ReactNode
  onCancel: () => void
  cancelLabel?: string
  cancelAria?: string
  trailing?: ReactNode
  /** Couleur de « Annuler » : celle de la discipline de l'écran. */
  tone?: Tone
  /** Retour à l'étape d'avant : chevron devant le libellé, comme sur iPhone. */
  back?: boolean
}) {
  // Opaque et collée en haut (zone de l'heure comprise) : le contenu défile dessous sans s'y mêler,
  // et un toucher sur le haut de l'écran ne tombe pas par erreur sur « Annuler ».
  return (
    <div className="sticky top-0 z-10 -mx-4 -mt-[env(safe-area-inset-top)] mb-2 box-content grid h-11 grid-cols-[1fr_auto_1fr] items-center bg-bg px-4 pt-[env(safe-area-inset-top)]">
      <button
        type="button"
        aria-label={cancelAria}
        onClick={onCancel}
        className={`hit tap t-body flex items-center justify-self-start py-2 whitespace-nowrap ${back ? '-ml-2' : ''} ${TONE.text[tone]}`}
      >
        {back && <Icon name="chevron" size="1.4em" className="rotate-180" />}
        {cancelLabel}
      </button>
      <div className="t-headline truncate text-center">{title}</div>
      <div className="justify-self-end">{trailing}</div>
    </div>
  )
}
