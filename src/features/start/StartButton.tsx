import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { nextProgram } from '../../domain/progression'
import { Group, Row } from '../../ui/List'
import { Sheet } from '../../ui/Sheet'

/**
 * « Commencer », toujours à portée de pouce au-dessus des onglets : guitare ou sport, en direct ou une
 * séance déjà faite à noter. Deux taps pour lancer.
 */
export function StartButton() {
  const { data } = useAppData()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const next = nextProgram(data.programs, data.sportSessions)
  const go = (close: () => void, to: string, state?: object) => {
    close()
    navigate(to, state ? { state } : undefined)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-scale t-headline fixed right-4 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 flex min-h-12 items-center gap-1.5 rounded-full bg-accent px-5 text-on-accent shadow-raised"
      >
        <Icon name="play" />
        Commencer
      </button>
      {open && (
        <Sheet label="Commencer" onClose={() => setOpen(false)} title={() => <h2 className="t-headline text-center">Commencer</h2>}>
          {(close) => (
            <div className="flex flex-col gap-6">
              <Group header="Guitare">
                <Row icon={<Icon name="guitar" className="text-guitar" />} title="Jouer maintenant" onClick={() => go(close, '/jouer', { autostart: true })} />
                <Row icon={<Icon name="plus" className="text-guitar" />} title="Noter une séance déjà faite" onClick={() => go(close, '/log/guitare')} />
              </Group>
              <Group header="Sport">
                {next && (
                  <Row icon={<Icon name="sport" className="text-sport" />} title={`Séance ${next.name}`} subtitle="La prochaine de ton programme" onClick={() => go(close, '/log/sport', { programId: next.id })} />
                )}
                <Row icon={<Icon name="sport" className="text-sport" />} title="Choisir une séance" onClick={() => go(close, '/log/sport')} />
              </Group>
            </div>
          )}
        </Sheet>
      )}
    </>
  )
}
