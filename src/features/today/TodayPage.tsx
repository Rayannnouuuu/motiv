import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { lastLog } from '../../domain/lastLog'
import { allLevels } from '../../domain/levels'
import { guitarStreak } from '../../domain/streak'
import type { Domain } from '../../domain/types'
import { ProgressRing } from '../../ui/ProgressRing'
import { LevelSheet } from '../levels/LevelSheet'
import { ChallengeCard } from './ChallengeCard'
import { GuitarCard } from './GuitarCard'
import { SportCard } from './SportCard'

const SECTION_TITLE = 'text-xs font-semibold tracking-wide text-muted uppercase'

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`

export function TodayPage() {
  const { data, today } = useAppData()
  const [showLevels, setShowLevels] = useState(false)

  const streak = guitarStreak(data.guitarSessions, today)
  const levels = allLevels(data)
  const done = streak.remainingMin === 0
  const active = (domain: Domain) => data.challenges.find((c) => c.domain === domain && c.status === 'active' && c.level === levels[domain].level)
  // Défis bloquants en premier.
  const challenges = (['guitar', 'sport'] as const)
    .flatMap((d) => {
      const c = active(d)
      return c ? [{ c, d }] : []
    })
    .sort((a, b) => Number(levels[b.d].blocked) - Number(levels[a.d].blocked))

  return (
    <div className="flex flex-col gap-8">
      <section className="relative flex flex-col items-center gap-1 pt-4 text-center">
        <button
          type="button"
          aria-label={`Niveau ${levels.global.level}, voir la progression`}
          className="absolute top-0 right-0 rounded-full active:scale-95"
          onClick={() => setShowLevels(true)}
        >
          <ProgressRing value={levels.global.xpInLevel} max={levels.global.perLevel} size={52} stroke={6}>
            <span className="text-base font-bold tabular-nums">{levels.global.level}</span>
          </ProgressRing>
        </button>
        <div className={`text-7xl leading-none ${streak.days === 0 ? 'opacity-40 grayscale' : ''}`} aria-hidden>
          🔥
        </div>
        <p className="text-4xl font-bold tabular-nums">{plural(streak.days, 'jour', 'jours')}</p>
        <p className="text-muted">
          {done ? "Série tenue aujourd'hui ✓" : `Encore ${streak.remainingMin} min de guitare pour tenir la série`}
        </p>
      </section>

      {challenges.length > 0 && (
        <section className="flex flex-col gap-2 rounded-2xl border border-accent/30 bg-accent/5 p-3" aria-labelledby="challenges-title">
          <h2 id="challenges-title" className={SECTION_TITLE}>
            🎯 Défis en cours
          </h2>
          {challenges.map(({ c, d }) => (
            <ChallengeCard key={c.id} challenge={c} level={levels[d]} />
          ))}
        </section>
      )}

      <section className="flex flex-col gap-4" aria-labelledby="today-title">
        <h2 id="today-title" className={SECTION_TITLE}>
          Aujourd'hui
        </h2>
        <GuitarCard />
        <SportCard />
        {lastLog(data) && (
          <Link to="/log/corriger" className="self-center text-sm text-muted underline">
            Corriger le dernier log
          </Link>
        )}
      </section>

      {showLevels && <LevelSheet onClose={() => setShowLevels(false)} />}
    </div>
  )
}
