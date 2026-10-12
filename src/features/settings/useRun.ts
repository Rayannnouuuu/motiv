import { useState } from 'react'

/** Lance une action asynchrone avec état « occupé » et message d'erreur. */
export function useRun() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Renvoie `true` si l'action a réussi. */
  async function run(fn: () => Promise<void>): Promise<boolean> {
    setBusy(true)
    setError(null)
    try {
      await fn()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible pour le moment')
      return false
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run }
}
