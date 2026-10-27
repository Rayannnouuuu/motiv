import { useState } from 'react'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Sheet'

/** La mise en place (GUITARE.md niveau 0) : une fenêtre avant de jouer, jamais du temps de séance. */
export const SETUP_ITEMS: { id: string; label: string }[] = [
  { id: 'tune', label: 'Guitare accordée' },
  { id: 'clean-tone', label: 'Son clair réglé (gain bas, égaliseur au milieu)' },
  { id: 'posture', label: 'Posture et médiator en place' },
]

export const SETUP_IDS = SETUP_ITEMS.map((i) => i.id)

export function SetupSheet({ pending, onDone, onClose }: { pending: string[]; onDone: (ticked: string[]) => void; onClose: () => void }) {
  const items = SETUP_ITEMS.filter((i) => pending.includes(i.id))
  const [ticked, setTicked] = useState<string[]>([])
  return (
    <Sheet label="Avant de jouer" onClose={onClose} title={() => <h2 className="t-headline text-center">Avant de jouer</h2>}>
      {() => (
        <div className="flex flex-col gap-4">
          <p className="t-subhead text-muted">Quelques secondes, hors du temps de la séance. Coche ce qui est prêt.</p>
          <ul className="rows overflow-hidden rounded-xl bg-inset">
            {items.map((i) => (
              <li key={i.id}>
                <label className="tap flex items-center gap-3 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={ticked.includes(i.id)}
                    onChange={(e) => setTicked(e.target.checked ? [...ticked, i.id] : ticked.filter((x) => x !== i.id))}
                    className="size-5 accent-guitar"
                  />
                  <span className="t-body">{i.label}</span>
                </label>
              </li>
            ))}
          </ul>
          <Button tone="guitar" onClick={() => onDone(ticked)}>
            C’est parti
          </Button>
        </div>
      )}
    </Sheet>
  )
}
