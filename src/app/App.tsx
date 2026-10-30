import { lazy, Suspense, useEffect, type ComponentType, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { LevelUpWatcher } from '../features/levels/LevelUpWatcher'
import { TodayPage } from '../features/today/TodayPage'

/** Un écran chargé à la demande (un fichier JS par écran) ; Aujourd'hui reste dans le premier chargement. */
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) => lazy(() => load().then((m) => ({ default: m[name] })))
const LogGuitarPage = page(() => import('../features/log-guitar/LogGuitarPage'), 'LogGuitarPage')
const LogSportPage = page(() => import('../features/log-sport/LogSportPage'), 'LogSportPage')
const ProgressPage = page(() => import('../features/progress/ProgressPage'), 'ProgressPage')
const ParcoursPage = page(() => import('../features/guitar/ParcoursPage'), 'ParcoursPage')
const SettingsPage = page(() => import('../features/settings/SettingsPage'), 'SettingsPage')
const MePage = page(() => import('../features/me/MePage'), 'MePage')
const HistoryPage = page(() => import('../features/history/HistoryPage'), 'HistoryPage')
const ProofsPage = page(() => import('../features/proofs/ProofsPage'), 'ProofsPage')
const ExercisesPage = page(() => import('../features/library/LibraryPage'), 'ExercisesPage')
const SongsPage = page(() => import('../features/library/LibraryPage'), 'SongsPage')
const ModelsPage = page(() => import('../features/library/LibraryPage'), 'ModelsPage')
const LibraryRedirect = page(() => import('../features/library/LibraryPage'), 'LibraryRedirect')
const EditLogPage = page(() => import('../features/edit-log/EditLogPage'), 'EditLogPage')
const ExercisePage = page(() => import('../features/exercise/ExercisePage'), 'ExercisePage')
const PracticePage = page(() => import('../features/practice/PracticePage'), 'PracticePage')
const QuickLogPage = page(() => import('../features/quick-log/QuickLogPage'), 'QuickLogPage')
const XpResultPage = page(() => import('../features/xp/XpResultPage'), 'XpResultPage')
const MarathonPage = page(() => import('../features/marathon/MarathonPage'), 'MarathonPage')
const MarathonForm = page(() => import('../features/marathon/MarathonForm'), 'MarathonForm')
const RunPage = page(() => import('../features/marathon/RunPage'), 'RunPage')
const WeekPage = page(() => import('../features/week/WeekPage'), 'WeekPage')
const ReviewPage = page(() => import('../features/review/ReviewPage'), 'ReviewPage')
const StravaPage = page(() => import('../features/strava/StravaPage'), 'StravaPage')
const GuidedSessionPage = page(() => import('../features/guitar/GuidedSessionPage'), 'GuidedSessionPage')

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Marge de 20 px ; la place de la barre d'onglets en fin de page. */}
      <main className="mx-auto max-w-md px-5 pt-[env(safe-area-inset-top)] pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
      <BottomNav />
    </>
  )
}

/** Écran de saisie, présenté par-dessus (monte en se posant) : pas de navigation basse. */
function Focus({ children }: { children: ReactNode }) {
  return (
    <main className="animate-present mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[env(safe-area-inset-top)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Suspense fallback={null}>{children}</Suspense>
    </main>
  )
}

/** Un nouvel écran s'ouvre en haut ; un retour arrière garde sa position (le navigateur la restaure). */
function ScrollReset() {
  const { pathname } = useLocation()
  const type = useNavigationType()
  useEffect(() => {
    if (type !== 'POP') window.scrollTo(0, 0)
  }, [pathname, type])
  return null
}

export function AppRoutes() {
  return (
    <>
      <ScrollReset />
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
          path="/plan/course"
          element={
            <Shell>
              <MarathonPage />
            </Shell>
          }
        />
        <Route
          path="/moi/profil"
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
        {/* L'exo en cours d'une séance guitare : les onglets restent ; en sortir met le chrono en pause. */}
        <Route
          path="/jouer/exo/:id"
          element={
            <Shell>
              <ExercisePage />
            </Shell>
          }
        />
        <Route
          path="/seance"
          element={
            <Focus>
              <GuidedSessionPage />
            </Focus>
          }
        />
        <Route
          path="/moi/strava"
          element={
            <Focus>
              <StravaPage />
            </Focus>
          }
        />
        <Route
          path="/bilan"
          element={
            <Focus>
              <ReviewPage />
            </Focus>
          }
        />
        <Route
          path="/parcours/:track"
          element={
            <Shell>
              <ParcoursPage />
            </Shell>
          }
        />
        <Route
          path="/plan"
          element={
            <Shell>
              <WeekPage />
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
          path="/moi/exercices"
          element={
            <Shell>
              <ExercisesPage />
            </Shell>
          }
        />
        <Route
          path="/moi/morceaux"
          element={
            <Shell>
              <SongsPage />
            </Shell>
          }
        />
        <Route
          path="/moi/modeles"
          element={
            <Shell>
              <ModelsPage />
            </Shell>
          }
        />
        <Route
          path="/moi"
          element={
            <Shell>
              <MePage />
            </Shell>
          }
        />
        <Route
          path="/preuves"
          element={
            <Shell>
              <ProofsPage />
            </Shell>
          }
        />
        <Route
          path="/seances"
          element={
            <Shell>
              <HistoryPage />
            </Shell>
          }
        />
        <Route
          path="/moi/reglages"
          element={
            <Shell>
              <SettingsPage />
            </Shell>
          }
        />
        {/* Anciennes adresses (favoris, anciens rappels). */}
        <Route path="/semaine" element={<Navigate to="/plan" replace />} />
        <Route path="/marathon" element={<Navigate to="/plan/course" replace />} />
        <Route path="/bibliotheque" element={<LibraryRedirect />} />
        <Route path="/morceaux" element={<Navigate to="/moi/morceaux" replace />} />
        <Route path="/marathon/profil" element={<Navigate to="/moi/profil" replace />} />
        <Route path="/strava" element={<Navigate to="/moi/strava" replace />} />
        <Route path="/reglages" element={<Navigate to="/moi/reglages" replace />} />
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
