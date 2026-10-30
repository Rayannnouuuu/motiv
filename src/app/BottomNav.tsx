import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Icon, type IconName } from '../design/icons'
import { StartSheet } from '../features/start/StartSheet'
import { useToday } from '../features/today/useToday'

/** Un onglet = un horizon de temps (REFONTE §7) : le jour, le plan, le passé, le long terme. */
const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: "Aujourd'hui", icon: 'today' },
  { to: '/plan', label: 'Plan', icon: 'week' },
  { to: '/progres', label: 'Progrès', icon: 'progress' },
  { to: '/moi', label: 'Moi', icon: 'me' },
]

function Tab({ to, label, icon }: (typeof TABS)[number]) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `tap flex min-h-12 flex-col items-center gap-1 pt-1 text-[0.6875rem] ${isActive ? 'font-bold text-accent' : 'font-medium text-muted'}`
      }
    >
      {({ isActive }) => (
        <>
          {/* Remonté à la sélection : le rebond rejoue à chaque fois qu'on choisit l'onglet. */}
          <span key={String(isActive)} className={`flex ${isActive ? 'animate-symbol' : ''}`}>
            <Icon name={icon} size={24} />
          </span>
          {label}
        </>
      )}
    </NavLink>
  )
}

/**
 * Barre d'onglets fixe : quatre onglets et « Commencer » au centre, qui lance toujours la prochaine séance
 * prévue (ou reprend celle en cours). Rien de prévu : il propose toutes les façons de commencer.
 */
export function BottomNav() {
  const navigate = useNavigate()
  const [next] = useToday().queue
  const [sheet, setSheet] = useState(false)

  return (
    <>
      <nav aria-label="Navigation principale" className="material fixed inset-x-0 bottom-0 z-20 border-t border-line pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid max-w-md grid-cols-5 items-start px-2 pt-2">
          {TABS.slice(0, 2).map((t) => (
            <li key={t.to}>
              <Tab {...t} />
            </li>
          ))}
          <li className="flex justify-center">
            <button
              type="button"
              aria-label={next ? (next.resume ? 'Reprendre la séance en cours' : 'Commencer la prochaine séance') : 'Commencer une séance'}
              onClick={() => (next ? navigate(next.action.to!, { state: next.action.state }) : setSheet(true))}
              className="tap-scale flex size-13 items-center justify-center rounded-full bg-accent text-on-accent shadow-raised"
            >
              <Icon name={next?.resume ? 'timer' : 'play'} size={24} />
            </button>
          </li>
          {TABS.slice(2).map((t) => (
            <li key={t.to}>
              <Tab {...t} />
            </li>
          ))}
        </ul>
      </nav>
      {sheet && <StartSheet onClose={() => setSheet(false)} />}
    </>
  )
}
