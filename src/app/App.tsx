import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { BottomNav } from '../ui/BottomNav'
import { StartButton } from '../features/start/StartButton'
import { LevelUpWatcher } from '../features/levels/LevelUpWatcher'
import { TodayPage } from '../features/today/TodayPage'

/** Un écran chargé à la demande (un fichier JS par écran) ; Aujourd'hui reste dans le premier chargement. */
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) => lazy(() => load().then((m) => ({ default: m[name] })))
const LogGuitarPage = page(() => import('../features/log-guitar/LogGuitarPage'), 'LogGuitarPage')
const LogSportPage = page(() => import('../features/log-sport/LogSportPage'), 'LogSportPage')
const ProgressPage = page(() => import('../features/progress/ProgressPage'), 'ProgressPage')
const SettingsPage = page(() => import('../features/settings/SettingsPage'), 'SettingsPage')
const LibraryPage = page(() => import('../features/library/LibraryPage'), 'LibraryPage')
const EditLogPage = page(() => import('../features/edit-log/EditLogPage'), 'EditLogPage')
const ExercisePage = page(() => import('../features/exercise/ExercisePage'), 'ExercisePage')
const PracticePage = page(() => import('../features/practice/PracticePage'), 'PracticePage')
const QuickLogPage = page(() => import('../features/quick-log/QuickLogPage'), 'QuickLogPage')
const XpResultPage = page(() => import('../features/xp/XpResultPage'), 'XpResultPage')
const MarathonPage = page(() => import('../features/marathon/MarathonPage'), 'MarathonPage')
const MarathonForm = page(() => import('../features/marathon/MarathonForm'), 'MarathonForm')
const RunPage = page(() => import('../features/marathon/RunPage'), 'RunPage')

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      {/* La place du bouton « Commencer » et de la barre d'onglets en fin de page. */}
      <main className="mx-auto max-w-md px-4 pt-[env(safe-area-inset-top)] pb-[calc(9rem+env(safe-area-inset-bottom))]">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
      <StartButton />
      <BottomNav />
    </>
  )
}

/** Écran de saisie, présenté par-dessus (monte en se posant) : pas de navigation basse. */
function Focus({ children }: { children: ReactNode }) {
  return (
    <main className="animate-present mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-[env(safe-area-inset-top)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Suspense fallback={null}>{children}</Suspense>
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
          path="/marathon"
          element={
            <Shell>
              <MarathonPage />
            </Shell>
          }
        />
        <Route
          path="/marathon/profil"
          element={
            <Focus>
              <MarathonForm />
            </Focus>
          }
        />
        <Route
          path="/course"
          element={
            <Focus>
              <RunPage />
            </Focus>
          }
        />
        {/* L'exo en cours d'une séance guitare : plein écran, sans onglets. */}
        <Route
          path="/jouer/exo/:id"
          element={
            <Focus>
              <ExercisePage />
            </Focus>
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
