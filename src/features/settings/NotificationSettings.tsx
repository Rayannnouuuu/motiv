import { useEffect, useState } from 'react'
import { currentSubscription, disablePush, enablePush, pushSupport, sendTestPush } from '../../data/push'
import { Button } from '../../ui/Button'
import { useRun } from './useRun'

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

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Notifications</h2>
      <p className="text-sm text-muted">
        Des rappels à des heures différentes chaque jour, seulement quand c'est utile : plan du jour (matin), séances de sport en retard, défi
        bloquant, série guitare à tenir (soir).
      </p>

      {support === 'needs-install' && (
        <p className="rounded-xl bg-surface-2 p-3 text-sm">
          Sur iPhone, les notifications ne marchent que depuis l'appli installée : dans Safari, Partager → <b>Sur l'écran d'accueil</b>, puis
          ouvre Motiv depuis son icône et reviens ici.
        </p>
      )}
      {support === 'unsupported' && <p className="text-sm text-muted">Ce navigateur ne gère pas les notifications push.</p>}

      {support === 'ok' && enabled === false && (
        <Button disabled={busy} onClick={() => run(async () => (await enablePush(), setEnabled(true)))}>
          Activer les notifications
        </Button>
      )}
      {support === 'ok' && enabled && (
        <>
          <p className="text-sm font-medium text-guitar">Notifications activées sur cet appareil ✓</p>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                setTested(false)
                await sendTestPush()
                setTested(true)
              })
            }
          >
            Envoyer une notification de test
          </Button>
          {tested && <p className="text-sm text-muted">Envoyée : elle doit arriver dans quelques secondes.</p>}
          <button
            type="button"
            disabled={busy}
            className="self-start text-sm text-muted underline"
            onClick={() => run(async () => (await disablePush(), setEnabled(false), setTested(false)))}
          >
            Désactiver
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  )
}
