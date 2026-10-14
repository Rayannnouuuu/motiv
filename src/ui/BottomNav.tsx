import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const icon = (d: ReactNode) => (active: boolean) => (
  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.7} strokeLinejoin="round" strokeLinecap="round">
    {d}
  </svg>
)

/** Onglets nommés d'après leur contenu, icônes pleines quand l'onglet est actif. */
const TABS = [
  {
    to: '/',
    label: "Aujourd'hui",
    icon: icon(<path d="M12 2.5c.4 3-1.6 4.6-3.2 6.4C7.3 10.6 6 12.4 6 15a6 6 0 0 0 12 0c0-2.4-1-4.3-2.4-5.9-.2 1.4-.9 2.5-2 3 .5-3.6-.3-7.1-1.6-9.6Z" />),
  },
  {
    to: '/progres',
    label: 'Progrès',
    icon: icon(
      <>
        <rect x="4" y="12" width="4" height="8" rx="1.2" />
        <rect x="10" y="7" width="4" height="13" rx="1.2" />
        <rect x="16" y="3.5" width="4" height="16.5" rx="1.2" />
      </>,
    ),
  },
  {
    to: '/reglages',
    label: 'Réglages',
    icon: icon(
      <path
        fillRule="evenodd"
        d="M10.3 2.6h3.4l.5 2.4c.6.2 1.2.5 1.7.9l2.3-.8 1.7 3-1.8 1.6a6.6 6.6 0 0 1 0 2l1.8 1.6-1.7 3-2.3-.8c-.5.4-1.1.7-1.7.9l-.5 2.4h-3.4l-.5-2.4c-.6-.2-1.2-.5-1.7-.9l-2.3.8-1.7-3 1.8-1.6a6.6 6.6 0 0 1 0-2L4.1 8.1l1.7-3 2.3.8c.5-.4 1.1-.7 1.7-.9l.5-2.4ZM12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z"
      />,
    ),
  },
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
                    {t.icon(isActive)}
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
