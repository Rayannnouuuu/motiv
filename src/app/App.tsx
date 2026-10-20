import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { BottomNav } from '../ui/BottomNav'
import { LogGuitarPage } from '../features/log-guitar/LogGuitarPage'
import { LogSportPage } from '../features/log-sport/LogSportPage'
import { ProgressPage } from '../features/progress/ProgressPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { LibraryPage } from '../features/library/LibraryPage'
import { StartButton } from '../features/start/StartButton'
import { EditLogPage } from '../features/edit-log/EditLogPage'
import { LevelUpWatcher } from '../features/levels/LevelUpWatcher'
import { ExercisePage } from '../features/exercise/ExercisePage'
import { PracticePage } from '../features/practice/PracticePage'
import { QuickLogPage } from '../features/quick-log/QuickLogPage'
import { TodayPage } from '../features/today/TodayPage'
import { XpResultPage } from '../features/xp/XpResultPage'

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      {/* La place du bouton « Commencer » et de la barre d'onglets en fin de page. */}
      <main className="mx-auto max-w-md px-4 pt-[env(safe-area-inset-top)] pb-[calc(9rem+env(safe-area-inset-bottom))]">{children}</main>
      <StartButton />
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
        <Route
          path="/log"
          element={
            <Focus>
              <QuickLogPage />
            </Focus>
          }
        />
        <Route
          path="/log/guitare"
          element={
            <Focus>
              <LogGuitarPage />
            </Focus>
          }
        />
        <Route
          path="/log/sport"
          element={
            <Focus>
              <LogSportPage />
            </Focus>
          }
        />
        <Route
          path="/jouer"
          element={
            <Focus>
              <PracticePage />
            </Focus>
          }
        />
        <Route
          path="/log/corriger"
          element={
            <Focus>
              <EditLogPage />
            </Focus>
          }
        />
        <Route
          path="/log/corriger/:id"
          element={
            <Focus>
              <EditLogPage />
            </Focus>
          }
        />
        <Route
          path="/xp"
          element={
            <Focus>
              <XpResultPage />
            </Focus>
          }
        />
        <Route
          path="/exo/:id"
          element={
            <Shell>
              <ExercisePage />
            </Shell>
          }
        />
        <Route
          path="/progres"
          element={
            <Shell>
              <ProgressPage />
            </Shell>
          }
        />
        <Route
          path="/bibliotheque"
          element={
            <Shell>
              <LibraryPage />
            </Shell>
          }
        />
        <Route
          path="/moi"
          element={
            <Shell>
              <SettingsPage />
            </Shell>
          }
        />
        {/* Anciennes adresses (favoris, anciens rappels). */}
        <Route path="/morceaux" element={<Navigate to="/bibliotheque?vue=morceaux" replace />} />
        <Route path="/reglages" element={<Navigate to="/moi" replace />} />
        <Route
          path="*"
          element={
            <Shell>
              <TodayPage />
            </Shell>
          }
        />
      </Routes>
      <LevelUpWatcher />
    </>
  )
}
