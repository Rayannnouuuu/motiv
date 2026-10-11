import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: "Aujourd'hui", icon: '🔥' },
  { to: '/progres', label: 'Progrès', icon: '📈' },
  { to: '/reglages', label: 'Réglages', icon: '⚙️' },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {TABS.map((t) => (
          <li key={t.to} className="flex-1">
            <NavLink
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-xs ${isActive ? 'font-semibold text-accent' : 'text-muted'}`
              }
            >
              <span aria-hidden className="text-lg leading-none">
                {t.icon}
              </span>
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
