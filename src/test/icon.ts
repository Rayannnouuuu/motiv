import type { IconName } from '../design/icons'

/** Icône du design system affichée dans `el` (attribut data-icon), null s'il n'y en a pas. */
export const icon = (el: Element, name: IconName) => el.querySelector(`[data-icon="${name}"]`)
