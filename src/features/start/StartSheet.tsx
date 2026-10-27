import { useNavigate } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { nextProgram } from '../../domain/progression'
import { Group, Row } from '../../ui/List'
import { Sheet } from '../../ui/Sheet'

/**
 * Toutes les façons de commencer : guitare ou sport, en direct ou une séance déjà faite à noter. S'ouvre depuis
 * « Commencer » au centre de la barre quand rien n'est prévu, et depuis Aujourd'hui (« Autre séance »).
 */
export function StartSheet({ onClose }: { onClose: () => void }) {
  const { data } = useAppData()
  const navigate = useNavigate()
  const next = nextProgram(data.programs, data.sportSessions)
  const go = (close: () => void, to: string, state?: object) => {
    close()
    navigate(to, state ? { state } : undefined)
  }

  return (
    <Sheet label="Commencer" onClose={onClose} title={() => <h2 className="t-headline text-center">Commencer</h2>}>
      {(close) => (
        <div className="flex flex-col gap-6">
          <Group header="Guitare">
            <Row
              icon={<Icon name="target" className="text-guitar" />}
              title="Séance guidée"
              subtitle="15 à 60 min, construite pour toi"
              onClick={() => go(close, '/seance')}
            />
            <Row icon={<Icon name="guitar" className="text-guitar" />} title="Jouer maintenant" onClick={() => go(close, '/jouer', { autostart: true })} />
            <Row
              icon={<Icon name="plus" className="text-guitar" />}
              title="Noter une séance déjà faite"
              onClick={() => go(close, '/log', { discipline: 'guitar' })}
            />
          </Group>
          <Group header="Sport">
            {next && (
              <Row
                icon={<Icon name="sport" className="text-sport" />}
                title={`Séance ${next.name}`}
                subtitle="La prochaine de ton programme"
                onClick={() => go(close, '/log/sport', { programId: next.id })}
              />
            )}
            <Row icon={<Icon name="sport" className="text-sport" />} title="Choisir une séance" onClick={() => go(close, '/log/sport')} />
            <Row
              icon={<Icon name="plus" className="text-sport" />}
              title="Noter une séance déjà faite"
              onClick={() => go(close, '/log', { discipline: 'sport' })}
            />
          </Group>
        </div>
      )}
    </Sheet>
  )
}
