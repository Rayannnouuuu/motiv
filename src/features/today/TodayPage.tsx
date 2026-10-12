import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { lastLog } from '../../domain/lastLog'
import { allLevels, type DomainLevel } from '../../domain/levels'
import { GUITAR_DAILY_MIN, guitarStreak } from '../../domain/streak'
import type { Domain } from '../../domain/types'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Gauge } from '../../ui/Gauge'
import { ChallengeCard } from './ChallengeCard'
import { SportCard } from './SportCard'
import { TodayPlan } from './TodayPlan'

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
  const navigate = useNavigate()

  const streak = guitarStreak(data.guitarSessions, today)
  const levels = allLevels(data)
  const done = streak.remainingMin === 0
  const active = (domain: Domain) => data.challenges.find((c) => c.domain === domain && c.status === 'active' && c.level === levels[domain].level)

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col items-center gap-1 pt-4 pb-2 text-center">
        <div className={`text-7xl leading-none ${streak.days === 0 ? 'opacity-40 grayscale' : ''}`} aria-hidden>
          🔥
        </div>
        <p className="text-4xl font-bold tabular-nums">{plural(streak.days, 'jour', 'jours')}</p>
        <p className="text-muted">
          {done ? "Série tenue aujourd'hui ✓" : `Encore ${streak.remainingMin} min de guitare pour tenir la série`}
        </p>
        <div className="mt-2 flex w-full items-center gap-2">
          <Gauge value={streak.todayMin} max={GUITAR_DAILY_MIN} color="guitar" label="Minutes de guitare aujourd'hui" className="h-1.5" />
          <span className="shrink-0 text-sm text-muted tabular-nums">
            {streak.todayMin}/{GUITAR_DAILY_MIN} min
          </span>
        </div>
        <Button
          variant={done ? 'secondary' : 'primary'}
          className="mt-3 w-full text-lg"
          onClick={() => navigate('/log/guitare', done ? undefined : { state: { durationMin: streak.remainingMin } })}
        >
          {done ? 'Logger une session' : `Logger ${streak.remainingMin} min`}
        </Button>
      </section>

      <SportCard />

      <TodayPlan />

      {lastLog(data) && (
        <Link to="/log/corriger" className="self-center text-sm text-muted underline">
          Corriger le dernier log
        </Link>
      )}

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

      {(['guitar', 'sport'] as const).map((d) => {
        const c = active(d)
        return c ? <ChallengeCard key={c.id} challenge={c} blocked={levels[d].blocked} /> : null
      })}
    </div>
  )
}
