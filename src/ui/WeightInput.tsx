import { useState } from 'react'

/** « 62,5 » ou « 62.5 » → 62.5 ; vide ou invalide → null. */
export function parseWeight(s: string): number | null {
  const n = Number(s.trim().replace(',', '.'))
  return s.trim() !== '' && Number.isFinite(n) && n >= 0 && n < 10000 ? n : null
}

const show = (kg: number) => String(kg).replace('.', ',')

/**
 * Champ de charge en kg qui accepte la virgule (clavier français).
 * Le texte tapé est gardé tel quel ; seule une valeur valide remonte. Un changement venu de l'extérieur
 * (boutons − / +, exo suivant) remplace le texte.
 */
export function WeightInput({
  value,
  onChange,
  className,
  ...rest
}: {
  value: number
  onChange: (kg: number) => void
  className?: string
  'aria-label': string
}) {
  const [draft, setDraft] = useState(show(value))
  const [synced, setSynced] = useState(value)
  if (value !== synced) {
    setSynced(value)
    if (parseWeight(draft) !== value) setDraft(show(value))
  }
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value)
        const kg = parseWeight(e.target.value)
        if (kg !== null) {
          setSynced(kg)
          onChange(kg)
        }
      }}
      onBlur={() => setDraft(show(value))}
      className={className}
      {...rest}
    />
  )
}
