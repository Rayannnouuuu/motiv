import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useAppData } from '../data/AppDataContext'
import { BottomNav } from '../ui/BottomNav'
import { PendingBanner } from '../ui/PendingBanner'
import { LogGuitarPage } from '../features/log-guitar/LogGuitarPage'
import { LogSportPage } from '../features/log-sport/LogSportPage'
import { ProgressPage } from '../features/progress/ProgressPage'
import { TodayPage } from '../features/today/TodayPage'
import { XpResultPage } from '../features/xp/XpResultPage'

function Placeholder({ title }: { title: string }) {
  return <h1 className="text-xl font-semibold">{title}</h1>
}

function Shell({ children }: { children: ReactNode }) {
  const { error } = useAppData()
  return (
    <>
      <main className="mx-auto max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-24">
        <PendingBanner />
        {error && (
          <p role="alert" className="mb-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-danger">
            Impossible de charger tes données : {error}
          </p>
        )}
        {children}
      </main>
      <BottomNav />
    </>
  )
}

/** Écran plein (logs) : pas de navigation basse. */
function Focus({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-6">{children}</main>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/log/guitare" element={<Focus><LogGuitarPage /></Focus>} />
      <Route path="/log/sport" element={<Focus><LogSportPage /></Focus>} />
      <Route path="/xp" element={<Focus><XpResultPage /></Focus>} />
      <Route path="/progres" element={<Shell><ProgressPage /></Shell>} />
      <Route path="/reglages" element={<Shell><Placeholder title="Réglages" /></Shell>} />
      <Route path="*" element={<Shell><TodayPage /></Shell>} />
    </Routes>
  )
}
