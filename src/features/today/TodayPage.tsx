import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { Icon, type IconName } from '../../design/icons'
import type { Tone } from '../../design/tone'
import { lastLog } from '../../domain/lastLog'
import { allLevels } from '../../domain/levels'
import { nextAction, type NextAction } from '../../domain/nextAction'
import { bestGuitarStreak, guitarStreak } from '../../domain/streak'
import type { Domain } from '../../domain/types'
import { Button } from '../../ui/Button'
import { Gauge } from '../../ui/Gauge'
import { ProgressRing } from '../../ui/ProgressRing'
import { Screen } from '../../ui/Screen'
import { LevelSheet } from '../levels/LevelSheet'
import { loadLive } from '../log-sport/liveSession'
import { runningPracticeMinutes } from '../practice/practiceSession'
import { ChallengeCard } from './ChallengeCard'
import { GuitarCard } from './GuitarCard'
import { SportCard } from './SportCard'
import { StorageNotices } from '../backup/StorageNotices'

const SECTION_TITLE = 't-footnote px-4 pb-1.5 text-muted uppercase'

/** Couleur de la discipline, et même icône dans les deux : lancer, ou reprendre une séance en cours. */
const ACTION_LOOK: Record<Exclude<NextAction['kind'], 'done'>, { tone: Tone; icon: IconName }> = {
  resumeSport: { tone: 'sport', icon: 'timer' },
  resumeGuitar: { tone: 'guitar', icon: 'timer' },
  playGuitar: { tone: 'guitar', icon: 'play' },
  startSport: { tone: 'sport', icon: 'play' },
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`

export function TodayPage() {
  const { data, today } = useAppData()
  const navigate = useNavigate()
  const [showLevels, setShowLevels] = useState(false)

  const streak = guitarStreak(data.guitarSessions, today)
  const levels = allLevels(data)
  const r = streak.remainingMin
  const done = r === 0
  const best = streak.days === 0 ? bestGuitarStreak(data.guitarSessions) : 0
  const subtitle = done
    ? "Série tenue aujourd'hui"
    : streak.days > 0
      ? `Encore ${r} min pour tenir la série`
      : best > 0
        ? `Record : ${plural(best, 'jour', 'jours')} · ${r} min aujourd'hui pour repartir`
        : `${r} min aujourd'hui pour lancer ta série`

  // La seule prochaine action : une séance en cours d'abord, puis la guitare du jour, puis le sport.
  const live = loadLive()
  const action = nextAction({
    data,
    today,
    guitarLiveMin: runningPracticeMinutes(),
    sportLiveProgram: (live && data.programs.find((p) => p.id === live.programId)?.name) ?? null,
  })
  // Seul « done » n'a pas de destination.
  const to = action.kind === 'done' ? undefined : action.to
  const look = action.kind === 'done' ? null : ACTION_LOOK[action.kind]
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
      className="hit tap-scale rounded-full"
      onClick={() => setShowLevels(true)}
    >
      <ProgressRing value={levels.global.xpInLevel} max={levels.global.perLevel} size={36} stroke={4}>
        <span className="t-footnote font-bold tabular-nums">{levels.global.level}</span>
      </ProgressRing>
    </button>
  )

  return (
    <Screen title="Aujourd'hui" trailing={ring}>
      <div className="flex flex-col gap-6">
        <StorageNotices />
        <section className="flex flex-col gap-4 rounded-2xl bg-surface p-4 shadow-card" aria-label="Série">
          <div className="flex items-center gap-4">
            {/* La série est celle de la guitare : son icône, dans sa couleur. */}
            <span
              className="animate-pop flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-guitar/25 to-guitar/5 text-guitar [animation-delay:250ms]"
              aria-hidden
            >
              <Icon name="guitar" size="2.125em" />
            </span>
            <div className="min-w-0">
              <p className="t-title1 tabular-nums">{streak.days === 0 ? 'Nouvelle série' : plural(streak.days, 'jour', 'jours')}</p>
              <p className={`t-subhead ${done ? 'font-semibold text-guitar' : 'text-muted'}`}>
                {subtitle}
                {done && <Icon name="check" className="ml-1" />}
              </p>
            </div>
          </div>
          <Gauge value={streak.todayMin} max={streak.targetMin} color="guitar" label="Minutes de guitare aujourd'hui" className="h-1.5" />
          {to && look ? (
            <Button tone={look.tone} className="w-full" onClick={() => navigate(to, { state: action.state })}>
              <Icon name={look.icon} />
              {action.label}
            </Button>
          ) : (
            <p className="t-subhead flex items-center justify-center gap-1 font-semibold text-accent">
              <Icon name="check" />
              {action.label} · à demain
            </p>
          )}
        </section>

        {challenges.length > 0 && (
          <section className="flex flex-col" aria-labelledby="challenges-title">
            <h2 id="challenges-title" className={`${SECTION_TITLE} flex items-center gap-1.5`}>
              <Icon name="target" />
              Défis en cours
            </h2>
            <div className="rows overflow-hidden rounded-2xl bg-surface shadow-card">
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
            <Link to="/log/corriger" className="hit tap t-subhead self-center py-2 text-accent">
              Corriger le dernier log
            </Link>
          )}
        </section>
      </div>

      {showLevels && <LevelSheet onClose={() => setShowLevels(false)} />}
    </Screen>
  )
}
