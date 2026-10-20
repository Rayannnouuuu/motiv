import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { BottomNav } from '../ui/BottomNav'
import { LogGuitarPage } from '../features/log-guitar/LogGuitarPage'
import { LogSportPage } from '../features/log-sport/LogSportPage'
import { ProgressPage } from '../features/progress/ProgressPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { SongsPage } from '../features/songs/SongsPage'
import { EditLogPage } from '../features/edit-log/EditLogPage'
import { LevelUpWatcher } from '../features/levels/LevelUpWatcher'
import { ExercisePage } from '../features/exercise/ExercisePage'
import { PracticePage } from '../features/practice/PracticePage'
import { TodayPage } from '../features/today/TodayPage'
import { XpResultPage } from '../features/xp/XpResultPage'

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="mx-auto max-w-md px-4 pt-[env(safe-area-inset-top)] pb-[calc(5.5rem+env(safe-area-inset-bottom))]">{children}</main>
      <BottomNav />
    </>
  )
}

/** Écran de saisie, présenté par-dessus (monte en se posant) : pas de navigation basse. */
function Focus({ children }: { children: ReactNode }) {
  return (
    <main className="animate-present mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-[env(safe-area-inset-top)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {children}
    </main>
  )
}

export function AppRoutes() {
  return (
    <>
    <Routes>
      <Route path="/log/guitare" element={<Focus><LogGuitarPage /></Focus>} />
      <Route path="/log/sport" element={<Focus><LogSportPage /></Focus>} />
      <Route path="/jouer" element={<Focus><PracticePage /></Focus>} />
      <Route path="/log/corriger" element={<Focus><EditLogPage /></Focus>} />
      <Route path="/log/corriger/:id" element={<Focus><EditLogPage /></Focus>} />
      <Route path="/xp" element={<Focus><XpResultPage /></Focus>} />
      <Route path="/exo/:id" element={<Shell><ExercisePage /></Shell>} />
      <Route path="/progres" element={<Shell><ProgressPage /></Shell>} />
      <Route path="/morceaux" element={<Shell><SongsPage /></Shell>} />
      <Route path="/reglages" element={<Shell><SettingsPage /></Shell>} />
      <Route path="*" element={<Shell><TodayPage /></Shell>} />
    </Routes>
    <LevelUpWatcher />
    </>
  )
}
