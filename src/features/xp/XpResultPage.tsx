import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { describeTarget, isChallengeMet } from '../../domain/challenges'
import { allLevels } from '../../domain/levels'
import type { Domain } from '../../domain/types'
import type { XpResult } from '../../domain/xp'
import { Fireworks } from '../../ui/Fireworks'
import { Gauge } from '../../ui/Gauge'

const LABEL: Record<Domain, string> = { guitar: 'Guitare', sport: 'Sport' }

export function XpResultPage() {
  const state = useLocation().state as { result: XpResult; domain: Domain; logId?: string } | null
  const { data } = useAppData()
  // Figé à l'arrivée : juste après le log, le défi est encore « actif » mais déjà atteint.
  const [met] = useState(() => data.challenges.filter((c) => c.status === 'active' && isChallengeMet(c, data)))
  if (!state?.result) return <Navigate to="/" replace />

  const { result, domain } = state
  const lvl = allLevels(data)[domain]

  return (
    <div className="flex flex-1 flex-col justify-center gap-6 text-center">
      {(result.total > 0 || met.length > 0) && <Fireworks size="small" />}
      <p className="text-6xl font-bold text-accent tabular-nums">+{result.total} XP</p>
      {met.map((c) => (
        <div key={c.id} className="rounded-2xl border-2 border-accent bg-accent/10 px-4 py-3">
          <p className="text-lg font-bold text-accent">🎯 Défi réussi !</p>
          <p>{describeTarget(c.target, data)}</p>
        </div>
      ))}
      <ul className="flex flex-col gap-1">
        {result.lines.map((l) => (
          <li key={l.label} className="flex justify-between rounded-xl bg-surface px-4 py-2 text-left">
            <span>{l.label}</span>
            <span className="font-semibold tabular-nums">+{l.xp}</span>
          </li>
        ))}
      </ul>
      <div className="text-left">
        <div className="flex justify-between text-sm">
          <span>
            {LABEL[domain]} · niveau {lvl.level}
          </span>
          <span className="text-muted tabular-nums">
            {lvl.xpInLevel} / {lvl.perLevel}
          </span>
        </div>
        <Gauge
          value={lvl.xpInLevel}
          from={Math.max(0, lvl.xpInLevel - result.total)}
          max={lvl.perLevel}
          color={domain}
          label={`${LABEL[domain]} : ${lvl.xpInLevel} / ${lvl.perLevel} XP`}
          className="mt-2 h-3"
        />
        {lvl.blocked && <p className="mt-2 text-sm font-semibold text-accent">Défi requis pour passer au niveau suivant</p>}
      </div>
      <Link to="/" className="rounded-xl bg-accent px-4 py-3 font-semibold text-white">
        Continuer
      </Link>
      <Link to={state.logId ? `/log/corriger/${state.logId}` : '/log/corriger'} className="text-sm text-muted underline">
        Une erreur ? Corriger ce log
      </Link>
    </div>
  )
}
