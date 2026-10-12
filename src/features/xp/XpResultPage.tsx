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
    <div className="flex flex-1 flex-col justify-center gap-6">
      {(result.total > 0 || met.length > 0) && <Fireworks size="small" />}
      <div className="animate-pop text-center">
        <p className="t-footnote font-semibold text-muted uppercase">{LABEL[domain]}</p>
        <p className="text-[3.75rem] leading-none font-bold tracking-[-0.03em] text-accent tabular-nums">+{result.total} XP</p>
      </div>
      {met.map((c) => (
        <div key={c.id} className="animate-rise rounded-[1rem] bg-accent/12 px-4 py-3 text-center">
          <p className="t-headline text-accent">🎯 Défi réussi !</p>
          <p className="t-subhead">{describeTarget(c.target, data)}</p>
        </div>
      ))}
      <ul className="rows animate-rise overflow-hidden rounded-[0.75rem] bg-surface" style={{ animationDelay: '80ms' }}>
        {result.lines.map((l) => (
          <li key={l.label} className="t-body flex min-h-11 items-center justify-between gap-3 px-4 py-2.5">
            <span>{l.label}</span>
            <span className="font-semibold text-accent tabular-nums">+{l.xp}</span>
          </li>
        ))}
      </ul>
      <div className="animate-rise rounded-[1rem] bg-surface p-4 shadow-card" style={{ animationDelay: '160ms' }}>
        <div className="t-subhead flex justify-between">
          <span className="font-semibold">
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
          className="mt-2.5 h-2.5"
        />
        {lvl.blocked && <p className="t-subhead mt-2 font-semibold text-accent">Défi requis pour passer au niveau suivant</p>}
      </div>
      <Link to="/" className="tap-scale t-headline mt-2 rounded-[0.875rem] bg-accent px-4 py-3.5 text-center text-white">
        Continuer
      </Link>
      <Link to={state.logId ? `/log/corriger/${state.logId}` : '/log/corriger'} className="tap t-subhead -mt-2 self-center py-2 text-accent">
        Une erreur ? Corriger ce log
      </Link>
    </div>
  )
}
