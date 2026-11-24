import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Icon, type IconName } from '../design/icons'
import { TONE } from '../design/tone'
import { StartSheet } from '../features/start/StartSheet'
import { useToday } from '../features/today/useToday'
import { inSpace, useSpace, type Space } from './space'

interface TabDef {
  to: string
  label: string
  icon: IconName
}

/**
 * Un onglet = un horizon de temps (REFONTE §7) : le jour, le plan, le passé, le long terme. Dans l'espace Guitare,
 * le plan de la semaine (sorties, muscu) laisse sa place au parcours (accords, gammes).
 */
const tabsOf = (space: Space | null): TabDef[] => [
  { to: '/', label: "Aujourd'hui", icon: 'today' },
  space === 'guitar' ? { to: '/parcours', label: 'Parcours', icon: 'target' } : { to: '/plan', label: 'Plan', icon: 'week' },
  { to: '/progres', label: 'Progrès', icon: 'progress' },
  { to: '/moi', label: 'Moi', icon: 'me' },
]

function Tab({ to, label, icon, active }: TabDef & { active: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `tap flex min-h-12 flex-col items-center gap-1 pt-1 text-[0.6875rem] ${isActive ? `font-bold ${active}` : 'font-medium text-muted'}`
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
  const { space } = useSpace()
  // Dans un espace, « Commencer » ne lance que ce qui lui appartient.
  const [next] = useToday().queue.filter((q) => inSpace(space, q.tone))
  const [sheet, setSheet] = useState(false)
  const tabs = tabsOf(space)
  const active = space ? TONE.text[space] : 'text-accent'

  return (
    <>
      <nav aria-label="Navigation principale" className="material fixed inset-x-0 bottom-0 z-20 border-t border-line pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid max-w-md grid-cols-5 items-start px-2 pt-2">
          {tabs.slice(0, 2).map((t) => (
            <li key={t.to}>
              <Tab {...t} active={active} />
            </li>
          ))}
          <li className="flex justify-center">
            <button
              type="button"
              aria-label={next ? (next.resume ? 'Reprendre la séance en cours' : 'Commencer la prochaine séance') : 'Commencer une séance'}
              onClick={() => (next ? navigate(next.action.to!, { state: next.action.state }) : setSheet(true))}
              className={`tap-scale flex size-13 items-center justify-center rounded-full shadow-raised ${space ? TONE.solid[space] : 'bg-accent text-on-accent'}`}
            >
              <Icon name={next?.resume ? 'timer' : 'play'} size={24} />
            </button>
          </li>
          {tabs.slice(2).map((t) => (
            <li key={t.to}>
              <Tab {...t} active={active} />
            </li>
          ))}
        </ul>
      </nav>
      {sheet && <StartSheet onClose={() => setSheet(false)} />}
    </>
  )
}
