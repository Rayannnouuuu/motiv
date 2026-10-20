import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { TONE } from '../../design/tone'
import { longDate } from '../../domain/date'
import { guitarWeek } from '../../domain/guitarWeek'
import { lastLog } from '../../domain/lastLog'
import { songsToMaintain } from '../../domain/repertoire'
import { sportWeek } from '../../domain/sportWeek'
import { weekGoals } from '../../domain/weekGoals'
import { Button } from '../../ui/Button'
import { StepList } from '../../ui/Hero'
import { SectionHeader } from '../../ui/List'
import { Pill } from '../../ui/Pill'
import { Screen } from '../../ui/Screen'
import { GoalTile, TileRow } from '../../ui/Tile'
import { StorageNotices } from '../backup/StorageNotices'
import { StartSheet } from '../start/StartSheet'
import { currentWeek, planWeekCount, planWeekProgress } from '../week/planWeek'
import { useToday, type DayCard } from './useToday'

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`
const UNIVERSE = { guitar: 'Guitare', sport: 'Sport' } as const
const STATE = { todo: 'À faire', live: 'En cours', done: 'Faite', rest: 'Repos' } as const

/** Carte d'une discipline, de même taille pour la guitare et le sport ; un toucher sur l'en-tête la déplie. */
function DayCardView({ card, next, open, onToggle }: { card: DayCard; next: boolean; open: boolean; onToggle: () => void }) {
  const navigate = useNavigate()
  const id = useId()
  const label = card.state === 'todo' && next ? 'Prochaine séance' : card.state === 'done' && card.tone === 'sport' ? 'Fait' : STATE[card.state]
  const canOpen = card.steps.length > 0 || card.cta !== null
  return (
    <section aria-labelledby={`${id}-title`} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <button
        type="button"
        aria-expanded={canOpen ? open : undefined}
        aria-controls={canOpen ? `${id}-body` : undefined}
        disabled={!canOpen}
        onClick={onToggle}
        className="tap-row flex w-full items-start gap-3 px-5 pt-4.5 pb-4 text-left disabled:cursor-default"
      >
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${TONE.tint[card.tone]}`}>
          <Icon name={card.state === 'done' ? 'check' : card.tone} size="1.4em" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={`t-overline ${TONE.text[card.tone]}`}>
            {UNIVERSE[card.tone]} · {label}
          </span>
          <span id={`${id}-title`} className="t-title2 mt-0.5">
            {card.title}
          </span>
          {card.subtitle && <span className="t-subhead mt-0.5 text-muted">{card.subtitle}</span>}
        </span>
        {canOpen && (
          <Icon name="chevron" size="1.4em" className={`mt-2 shrink-0 text-muted transition-transform duration-300 ${open ? '-rotate-90' : 'rotate-90'}`} />
        )}
      </button>
      {canOpen && open && (
        <div id={`${id}-body`} className="animate-rise flex flex-col gap-3 px-5 pb-5">
          {card.steps.length > 0 && <StepList tone={card.tone} steps={card.steps} label={`Étapes · ${UNIVERSE[card.tone]}`} />}
          {card.cta && (
            <Button
              tone={card.tone}
              variant={card.cta.secondary ? 'secondary' : 'primary'}
              className="w-full"
              onClick={() => navigate(card.cta!.to, { state: card.cta!.state })}
            >
              <Icon name={card.cta.icon} />
              {card.cta.label}
            </Button>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * Aujourd'hui : le jour (REFONTE §7). La guitare et le sport en deux cartes de même poids qui se déplient ; la
 * prochaine séance est ouverte. Puis les morceaux à entretenir et la semaine en deux tuiles.
 */
export function TodayPage() {
  const { data, v1, today } = useAppData()
  const navigate = useNavigate()
  const { queue, guitar, sport, streak, mk } = useToday()
  const [sheet, setSheet] = useState(false)
  const first = queue[0]?.tone
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const isOpen = (c: DayCard) => open[c.tone] ?? (c.tone === first || c.state === 'live')
  const toggle = (c: DayCard) => setOpen({ ...open, [c.tone]: !isOpen(c) })
  const maintain = songsToMaintain(v1.songs, v1.sessions, today)

  const goals = weekGoals(data, today)
  const minutes = guitarWeek(data.guitarSessions, today).days.reduce((n, d) => n + d.minutes, 0)
  const remaining = sportWeek(data.sportSessions, today).remaining
  const planWeek = currentWeek(mk?.plan)
  const sportGoal = planWeek ? planWeekCount(planWeek, v1.sessions) : goals.sport
  const cards = first === 'sport' ? [sport, guitar] : [guitar, sport]

  return (
    <Screen title="Aujourd'hui" overline={longDate(today)} pill={streak.days > 0 && <Pill>{plural(streak.days, 'jour', 'jours')} d'affilée</Pill>}>
      <div className="flex flex-col gap-6">
        <StorageNotices />

        <div className="flex flex-col gap-3">
          {cards.map((c) => (
            <DayCardView key={c.tone} card={c} next={c.tone === first} open={isOpen(c)} onToggle={() => toggle(c)} />
          ))}
        </div>

        {maintain.length > 0 && (
          <section aria-labelledby="also-title">
            <SectionHeader id="also-title" title="Aussi aujourd'hui" action={`${maintain.length} à faire`} />
            <div className="flex flex-col gap-2.5">
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
            <GoalTile tone="sport" done={sportGoal.done} goal={sportGoal.goal} unit="séances">
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
