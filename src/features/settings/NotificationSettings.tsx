import { useEffect, useState } from 'react'
import { currentSubscription, disablePush, enablePush, pushSupport, sendTestPush } from '../../data/push'
import { Group, Row } from '../../ui/List'
import { Switch } from '../../ui/Switch'
import { useRun } from './useRun'

const FOOTER =
  "Des rappels à des heures différentes chaque jour, seulement quand c'est utile : plan du jour (matin), séances de sport en retard, défi bloquant, série guitare à tenir (soir), et le résumé de ta semaine le dimanche soir."

/** Activer / tester / couper les rappels push sur cet appareil. */
export function NotificationSettings() {
  const support = pushSupport()
  const { busy, error, run } = useRun()
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [tested, setTested] = useState(false)

  useEffect(() => {
    if (support !== 'ok') return
    let alive = true
    currentSubscription()
      .then((s) => alive && setEnabled(s !== null))
      .catch(() => alive && setEnabled(false))
    return () => {
      alive = false
    }
  }, [support])

  const toggle = (on: boolean) =>
    run(async () => {
      if (on) {
        await enablePush()
        setEnabled(true)
      } else {
        await disablePush()
        setEnabled(false)
        setTested(false)
      }
    })

  return (
    <Group header="Notifications" labelledBy="notif-title" footer={error ? undefined : FOOTER}>
      {support === 'needs-install' && (
        <Row>
          <span className="t-subhead">
            Sur iPhone, les notifications ne marchent que depuis l'appli installée : dans Safari, Partager → <b>Sur l'écran d'accueil</b>, puis ouvre
            Motiv depuis son icône et reviens ici.
          </span>
        </Row>
      )}
      {support === 'unsupported' && <Row title="Ce navigateur ne gère pas les notifications push." />}
      {support === 'ok' && (
        <Row
          title="Rappels sur cet appareil"
          subtitle={enabled ? <span className="text-guitar">Notifications activées sur cet appareil ✓</span> : undefined}
          accessory={<Switch label="Notifications" checked={enabled ?? false} disabled={busy || enabled === null} onChange={toggle} />}
        />
      )}
      {support === 'ok' && enabled && (
        <Row
          onClick={() =>
            void run(async () => {
              setTested(false)
              await sendTestPush()
              setTested(true)
            })
          }
          chevron={false}
          className={busy ? 'pointer-events-none opacity-40' : ''}
        >
          <span className="t-body text-accent">Envoyer une notification de test</span>
          {tested && <span className="t-footnote text-muted">Envoyée : elle doit arriver dans quelques secondes.</span>}
        </Row>
      )}
      {error && (
        <Row>
          <p role="alert" className="t-subhead text-danger">
            {error}
          </p>
        </Row>
      )}
    </Group>
  )
}
