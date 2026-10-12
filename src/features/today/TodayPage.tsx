import { Link } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { lastLog } from '../../domain/lastLog'
import { allLevels, type DomainLevel } from '../../domain/levels'
import { guitarStreak } from '../../domain/streak'
import type { Domain } from '../../domain/types'
import { Card } from '../../ui/Card'
import { Gauge } from '../../ui/Gauge'
import { ChallengeCard } from './ChallengeCard'
import { GuitarCard } from './GuitarCard'
import { SportCard } from './SportCard'

const SECTION_TITLE = 'text-xs font-semibold tracking-wide text-muted uppercase'

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`

function DomainLine({ icon, label, lvl, color }: { icon: string; label: string; lvl: DomainLevel; color: 'guitar' | 'sport' }) {
  return (
    <div className="flex-1">
      <div className="flex items-baseline justify-between text-sm">
        <span>
          {icon} niv. {lvl.level}
        </span>
        {lvl.blocked && <span className="text-xs font-semibold text-accent">Défi requis</span>}
      </div>
      <Gauge value={lvl.xpInLevel} max={lvl.perLevel} color={color} label={`${label} : ${lvl.xpInLevel} / ${lvl.perLevel} XP`} className="mt-1 h-1.5" />
      {lvl.reserve > 0 && <p className="mt-1 text-xs text-muted">+{lvl.reserve} XP en réserve</p>}
    </div>
  )
}

export function TodayPage() {
  const { data, today } = useAppData()

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
      <section className="flex flex-col items-center gap-1 pt-4 text-center">
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

      <section className="flex flex-col gap-4" aria-labelledby="levels-title">
        <h2 id="levels-title" className={SECTION_TITLE}>
          Progression
        </h2>
        <Card>
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-semibold">Niveau {levels.global.level}</p>
          <p className="text-sm text-muted">{levels.global.perLevel - levels.global.xpInLevel} XP restants</p>
        </div>
        <Gauge value={levels.global.xpInLevel} max={levels.global.perLevel} label="Niveau global" className="mt-2 h-2.5" />
        <div className="mt-3 flex gap-4">
          <DomainLine icon="🎸" label="Guitare" lvl={levels.guitar} color="guitar" />
          <DomainLine icon="🏋️" label="Sport" lvl={levels.sport} color="sport" />
        </div>
        </Card>
      </section>
    </div>
  )
}
