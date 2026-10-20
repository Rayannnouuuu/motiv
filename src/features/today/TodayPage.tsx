import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { longDate } from '../../domain/date'
import { guitarWeek } from '../../domain/guitarWeek'
import { lastLog } from '../../domain/lastLog'
import { songsToMaintain } from '../../domain/repertoire'
import { sportWeek } from '../../domain/sportWeek'
import { weekGoals } from '../../domain/weekGoals'
import { Button } from '../../ui/Button'
import { Hero, StepList } from '../../ui/Hero'
import { Pill } from '../../ui/Pill'
import { SectionHeader } from '../../ui/List'
import { Screen } from '../../ui/Screen'
import { GoalTile, TileRow } from '../../ui/Tile'
import { StorageNotices } from '../backup/StorageNotices'
import { StartSheet } from '../start/StartSheet'
import { currentWeek, planWeekProgress } from '../week/planWeek'
import { useToday, type SessionView } from './useToday'

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`
const UNIVERSE = { guitar: 'Guitare', sport: 'Sport' } as const

function NextHero({ view }: { view: SessionView }) {
  const navigate = useNavigate()
  return (
    <Hero
      tone={view.tone}
      overline={`${view.resume ? 'En cours' : 'Prochaine séance'} · ${UNIVERSE[view.tone]}`}
      titleId="next-title"
      title={view.title}
      subtitle={view.subtitle}
    >
      {view.steps.length > 0 && <StepList tone={view.tone} steps={view.steps} label="Étapes de la séance" />}
      <Button tone={view.tone} className="w-full" onClick={() => navigate(view.action.to!, { state: view.action.state })}>
        <Icon name={view.resume ? 'timer' : 'play'} />
        {view.resume ? 'Reprendre' : 'Commencer'}
      </Button>
    </Hero>
  )
}

/**
 * Aujourd'hui : le jour, quoi faire maintenant en un bouton (REFONTE §7). La prochaine séance en héros, les
 * autres séances du jour et les morceaux à entretenir, puis la semaine en deux tuiles.
 */
export function TodayPage() {
  const { data, v1, today } = useAppData()
  const navigate = useNavigate()
  const { queue, streak, mk } = useToday()
  const [sheet, setSheet] = useState(false)
  const [next, ...others] = queue
  const maintain = songsToMaintain(v1.songs, v1.sessions, today)

  const goals = weekGoals(data, today)
  const minutes = guitarWeek(data.guitarSessions, today).days.reduce((n, d) => n + d.minutes, 0)
  const remaining = sportWeek(data.sportSessions, today).remaining
  const planWeek = currentWeek(mk?.plan)
  const go = (v: SessionView) => navigate(v.action.to!, { state: v.action.state })

  return (
    <Screen title="Aujourd'hui" overline={longDate(today)} pill={streak.days > 0 && <Pill>{plural(streak.days, 'jour', 'jours')} d'affilée</Pill>}>
      <div className="flex flex-col gap-6">
        <StorageNotices />

        {next ? (
          <NextHero view={next} />
        ) : (
          <Hero tone="accent" overline="Journée bouclée" titleId="next-title" title="Tout est fait" subtitle="Guitare et sport sont à jour. À demain !">
            <Button variant="secondary" tone="guitar" className="w-full" onClick={() => navigate('/jouer', { state: { autostart: true } })}>
              <Icon name="play" />
              Rejouer avec le chrono
            </Button>
          </Hero>
        )}

        {others.length + maintain.length > 0 && (
          <section aria-labelledby="also-title">
            <SectionHeader id="also-title" title="Aussi aujourd'hui" action={`${others.length + maintain.length} à faire`} />
            <div className="flex flex-col gap-2.5">
              {others.map((v) => (
                <TileRow key={v.action.kind} tone={v.tone} title={`${UNIVERSE[v.tone]} · ${v.title}`} subtitle={v.subtitle} onClick={() => go(v)} />
              ))}
              {maintain.map(({ song, since }) => (
                <TileRow
                  key={song.id}
                  tone="guitar"
                  icon="song"
                  title={`À entretenir · ${song.title}`}
                  subtitle={since === null ? 'Pas encore joué depuis sa maîtrise' : `Pas joué depuis ${since} jours`}
                  onClick={() => navigate('/log/guitare', { state: { songTitle: song.title } })}
                />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="week-title">
          <SectionHeader
            id="week-title"
            title="Cette semaine"
            action={
              <Link to="/semaine" className="hit tap">
                Voir la semaine
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-2.5">
            <GoalTile tone="guitar" done={goals.guitar.done} goal={goals.guitar.goal} unit="séances">
              {minutes} min jouées
            </GoalTile>
            <GoalTile tone="sport" done={goals.sport.done} goal={goals.sport.goal} unit="séances">
              {planWeek ? (
                planWeekProgress(planWeek, v1.sessions).text
              ) : data.programs.length === 0 ? (
                <Link to="/bibliotheque?vue=modeles" className="hit tap font-semibold text-sport">
                  Choisir ton programme
                </Link>
              ) : remaining === 0 ? (
                'Semaine validée'
              ) : (
                `Encore ${plural(remaining, 'séance', 'séances')}`
              )}
            </GoalTile>
          </div>
        </section>

        <div className="flex flex-col items-center gap-1">
          <button type="button" className="hit tap t-subhead py-2 text-accent" onClick={() => setSheet(true)}>
            Autre séance ou séance déjà faite
          </button>
          {lastLog(data) && (
            <Link to="/log/corriger" className="hit tap t-subhead py-2 text-muted">
              Corriger le dernier log
            </Link>
          )}
        </div>
      </div>
      {sheet && <StartSheet onClose={() => setSheet(false)} />}
    </Screen>
  )
}
