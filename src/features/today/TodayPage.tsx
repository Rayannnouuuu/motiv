import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { lastLog } from '../../domain/lastLog'
import { allLevels } from '../../domain/levels'
import { guitarStreak } from '../../domain/streak'
import type { Domain } from '../../domain/types'
import { ProgressRing } from '../../ui/ProgressRing'
import { Screen } from '../../ui/Screen'
import { LevelSheet } from '../levels/LevelSheet'
import { ChallengeCard } from './ChallengeCard'
import { GuitarCard } from './GuitarCard'
import { SportCard } from './SportCard'

const SECTION_TITLE = 't-footnote px-4 pb-1.5 text-muted uppercase'

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

  const ring = (
    <button
      type="button"
      aria-label={`Niveau ${levels.global.level}, voir la progression`}
      className="tap-scale rounded-full"
      onClick={() => setShowLevels(true)}
    >
      <ProgressRing value={levels.global.xpInLevel} max={levels.global.perLevel} size={36} stroke={4}>
        <span className="text-[0.8125rem] font-bold tabular-nums">{levels.global.level}</span>
      </ProgressRing>
    </button>
  )

  return (
    <Screen title="Aujourd'hui" trailing={ring}>
      <div className="flex flex-col gap-6">
        <section className="flex items-center gap-4 rounded-[1.25rem] bg-surface p-4 shadow-card" aria-label="Série">
          <span
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-[2.25rem] leading-none ${
              streak.days === 0 ? 'bg-fill opacity-60 grayscale' : 'bg-gradient-to-b from-accent/25 to-accent/5'
            }`}
            aria-hidden
          >
            🔥
          </span>
          <div className="min-w-0">
            <p className="t-title1 tabular-nums">{plural(streak.days, 'jour', 'jours')}</p>
            <p className={`t-subhead ${done ? 'font-semibold text-guitar' : 'text-muted'}`}>
              {done ? "Série tenue aujourd'hui ✓" : `Encore ${streak.remainingMin} min de guitare pour tenir la série`}
            </p>
          </div>
        </section>

        {challenges.length > 0 && (
          <section className="flex flex-col" aria-labelledby="challenges-title">
            <h2 id="challenges-title" className={SECTION_TITLE}>
              🎯 Défis en cours
            </h2>
            <div className="rows overflow-hidden rounded-[1.25rem] bg-surface shadow-card">
              {challenges.map(({ c, d }) => (
                <ChallengeCard key={c.id} challenge={c} level={levels[d]} />
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-4" aria-labelledby="today-title">
          <h2 id="today-title" className="sr-only">
            Aujourd'hui
          </h2>
          <GuitarCard />
          <SportCard />
          {lastLog(data) && (
            <Link to="/log/corriger" className="tap t-subhead self-center py-2 text-accent">
              Corriger le dernier log
            </Link>
          )}
        </section>
      </div>

      {showLevels && <LevelSheet onClose={() => setShowLevels(false)} />}
    </Screen>
  )
}
