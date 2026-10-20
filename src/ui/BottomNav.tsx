import { NavLink } from 'react-router-dom'
import { Icon, type IconName } from '../design/icons'

/** Les 4 onglets de la refonte (REFONTE §7). */
const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: "Aujourd'hui", icon: 'today' },
  { to: '/progres', label: 'Progrès', icon: 'progress' },
  { to: '/bibliotheque', label: 'Bibliothèque', icon: 'library' },
  { to: '/moi', label: 'Moi', icon: 'me' },
]

export function BottomNav() {
  return (
    <nav className="material fixed inset-x-0 bottom-0 z-20 border-t border-line pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md">
        {TABS.map((t) => (
          <li key={t.to} className="flex-1">
            <NavLink
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) => `tap flex flex-col items-center gap-0.5 pt-1.5 pb-1 text-[0.625rem] font-medium tracking-[0.01em] ${isActive ? 'text-accent' : 'text-muted'}`}
            >
              {({ isActive }) => (
                <>
                  {/* Remonté à la sélection : le rebond rejoue à chaque fois qu'on choisit l'onglet. */}
                  <span key={String(isActive)} className={`flex ${isActive ? 'animate-symbol' : ''}`}>
                    <Icon name={t.icon} size={26} />
                  </span>
                  {t.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
