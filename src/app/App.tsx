import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { BottomNav } from '../ui/BottomNav'

function Placeholder({ title }: { title: string }) {
  return <h1 className="text-xl font-semibold">{title}</h1>
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="mx-auto max-w-md px-4 pt-4 pb-24">{children}</main>
      <BottomNav />
    </>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/log/guitare" element={<Placeholder title="Log guitare" />} />
      <Route path="/log/sport" element={<Placeholder title="Log sport" />} />
      <Route path="/login" element={<Placeholder title="Connexion" />} />
      <Route path="/progres" element={<Shell><Placeholder title="Progrès" /></Shell>} />
      <Route path="/reglages" element={<Shell><Placeholder title="Réglages" /></Shell>} />
      <Route path="*" element={<Shell><Placeholder title="Aujourd'hui" /></Shell>} />
    </Routes>
  )
}
