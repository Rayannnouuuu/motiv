import { useState } from 'react'
import { useActions } from '../../data/AppDataContext'
import type { Movement } from '../../domain/model'
import { Button } from '../../ui/Button'
import { Segmented } from '../../ui/Segmented'
import { Sheet } from '../../ui/Sheet'

const num = 'size-11 rounded-sm bg-fill text-center tabular-nums outline-none'
const BODY = [
  { value: 'upper', label: 'Haut du corps' },
  { value: 'lower', label: 'Bas du corps' },
] as const

/**
 * Modifier un mouvement : son nom, haut ou bas du corps (le pas de charge : +2,5 ou +5 kg), la fourchette
 * de répétitions de la double progression. L'historique reste attaché au mouvement.
 */
export function MovementSheet({ movement: m, onClose }: { movement: Movement; onClose: () => void }) {
  const { saveMovement } = useActions()
  const [name, setName] = useState(m.name)
  const [body, setBody] = useState(m.body)
  const [min, setMin] = useState(m.repRange?.[0] ?? 0)
  const [max, setMax] = useState(m.repRange?.[1] ?? 0)
  const [busy, setBusy] = useState(false)
  const counted = m.metric === 'load_reps' || m.metric === 'reps'
  const valid = name.trim() !== '' && (!counted || (min === 0 && max === 0) || (min > 0 && min <= max))

  return (
    <Sheet label={`Modifier ${m.name}`} onClose={onClose} title={() => <h2 className="t-headline text-center">Mouvement</h2>}>
      {(close) => (
        <div className="flex flex-col gap-5">
          <input aria-label="Nom du mouvement" value={name} onChange={(e) => setName(e.target.value)} className="t-body min-h-11 rounded-sm bg-fill px-3 outline-none" />
          <Segmented label="Partie du corps" options={[...BODY]} value={body ?? 'upper'} onChange={setBody} />
          {counted && (
            <label className="flex items-center gap-2">
              <span className="t-body flex-1">Fourchette de répétitions</span>
              <input aria-label="Reps minimum" inputMode="numeric" value={min || ''} onChange={(e) => setMin(Number(e.target.value.replace(/\D/g, '')))} className={`t-callout ${num}`} />
              <span className="t-footnote text-muted" aria-hidden>
                à
              </span>
              <input aria-label="Reps maximum" inputMode="numeric" value={max || ''} onChange={(e) => setMax(Number(e.target.value.replace(/\D/g, '')))} className={`t-callout ${num}`} />
            </label>
          )}
          <Button
            tone="sport"
            disabled={!valid || busy}
            onClick={() => {
              setBusy(true)
              void saveMovement({ ...m, name: name.trim(), body: body ?? 'upper', repRange: counted && min > 0 ? [min, max] : m.repRange })
                .then(close)
                .finally(() => setBusy(false))
            }}
          >
            Enregistrer
          </Button>
        </div>
      )}
    </Sheet>
  )
}
