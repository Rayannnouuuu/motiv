import { useId, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { TONE } from '../../design/tone'
import { longDate } from '../../domain/date'
import { focusOf, reviewDue } from '../../domain/weeklyReview'
import { guitarWeek } from '../../domain/guitarWeek'
import { songsToMaintain } from '../../domain/repertoire'
import { Button } from '../../ui/Button'
import { StepList } from '../../ui/Hero'
import { SectionHeader } from '../../ui/List'
import { Pill } from '../../ui/Pill'
import { Screen } from '../../ui/Screen'
import { GoalTile, TileRow } from '../../ui/Tile'
import { StorageNotices } from '../backup/StorageNotices'
import { StartSheet } from '../start/StartSheet'
import { currentWeek, planWeekProgress } from '../week/planWeek'
import { useRhythm } from '../week/useRhythm'
import { MorningCheckin } from './MorningCheckin'
import { PlateauCard } from './PlateauCard'
import { useToday, type DayCard } from './useToday'

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`
const UNIVERSE = { guitar: 'Guitare', sport: 'Sport' } as const
const STATE = { todo: 'À faire', live: 'En cours', done: 'Faite', rest: 'Repos' } as const

/** Carte d'une discipline, de même taille pour la guitare et le sport ; un toucher sur l'en-tête la déplie. */
function DayCardView({ card, next, open, onToggle, extra }: { card: DayCard; next: boolean; open: boolean; onToggle: () => void; extra?: ReactNode }) {
  const navigate = useNavigate()
  const id = useId()
  const label = card.state === 'todo' && next ? 'Prochaine séance' : card.state === 'done' && card.tone === 'sport' ? 'Fait' : STATE[card.state]
  const canOpen = card.steps.length > 0 || card.cta !== null || Boolean(extra)
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
          {extra}
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

const chip = (on: boolean) =>
  `hit tap-scale t-footnote inline-flex h-8 items-center gap-1 rounded-full px-3 font-semibold whitespace-nowrap ${on ? 'bg-sport text-on-sport' : 'border border-line text-ink'}`

/** Composer la séance de sport du jour : une autre séance de muscu, ou la course seule ; la course à la fin en option. */
function SportChooser({
  choices,
  programId,
  withRun,
  onChange,
}: {
  choices: { id: string; name: string }[]
  programId: string | null
  withRun: boolean
  onChange: (programId: string | null, withRun: boolean) => void
}) {
  // Rien de choisi (jour de repos) : aucune pastille allumée.
  const runOnly = programId === null && withRun
  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Séance de sport du jour" className="flex flex-wrap gap-1.5">
        {choices.map((c) => (
          <button key={c.id} type="button" aria-pressed={programId === c.id} className={chip(programId === c.id)} onClick={() => onChange(c.id, withRun)}>
            <Icon name="muscu" />
            {c.name}
          </button>
        ))}
        <button type="button" aria-pressed={runOnly} className={chip(runOnly)} onClick={() => onChange(null, true)}>
          <Icon name="sport" />
          Course seule
        </button>
      </div>
      {programId !== null && (
        <button type="button" aria-pressed={withRun} className={`${chip(withRun)} self-start`} onClick={() => onChange(programId, !withRun)}>
          <Icon name={withRun ? 'check' : 'plus'} />
          Course à la fin
        </button>
      )}
    </div>
  )
}

/**
 * Aujourd'hui : le jour (REFONTE §7). La guitare et le sport en deux cartes de même poids qui se déplient ; la
 * prochaine séance est ouverte. Puis les morceaux à entretenir et la semaine en deux tuiles.
 */
export function TodayPage() {
  const { data, v1, today } = useAppData()
  const navigate = useNavigate()
  const { queue, guitar, sport: planned, mk, choices, pick, custom } = useToday()
  const rhythm = useRhythm()
  // Séance de sport composée à la main (autre séance, course à la fin) : remplace celle prévue.
  const [compose, setCompose] = useState<{ programId: string | null; withRun: boolean } | null>(null)
  const sport = compose ? custom(compose.programId, compose.withRun) : planned
  const chosen = compose ?? pick
  const [sheet, setSheet] = useState(false)
  const first = queue[0]?.tone
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const isOpen = (c: DayCard) => open[c.tone] ?? (c.tone === first || c.state === 'live')
  const toggle = (c: DayCard) => setOpen({ ...open, [c.tone]: !isOpen(c) })
  const maintain = songsToMaintain(v1.songs, v1.sessions, today)

  const goals = rhythm.week
  const minutes = guitarWeek(data.guitarSessions, today).days.reduce((n, d) => n + d.minutes, 0)
  const remaining = Math.max(0, goals.sport.goal - goals.sport.done)
  const planWeek = currentWeek(mk?.plan)
  const sportGoal = goals.sport
  const cards = first === 'sport' ? [sport, guitar] : [guitar, sport]

  return (
    <Screen
      title="Aujourd'hui"
      overline={longDate(today)}
      pill={rhythm.streak.weeks > 0 && <Pill>{plural(rhythm.streak.weeks, 'semaine', 'semaines')} d'affilée</Pill>}
    >
      <div className="flex flex-col gap-6">
        <StorageNotices />
        <MorningCheckin />

        {reviewDue(v1.profile.reviews, today) && (
          <Link to="/bilan" className="tap-row flex min-h-16 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-fill text-ink">
              <Icon name="target" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="t-subhead font-semibold">Bilan de la semaine · 2 min</span>
              <span className="t-footnote text-muted">Ce qui a marché, ce qui a bloqué, ton focus</span>
            </span>
            <Icon name="chevron" className="text-faint" />
          </Link>
        )}

        <div className="flex flex-col gap-3">
          {cards.map((c) => (
            <DayCardView
              key={c.tone}
              card={c}
              next={c.tone === first}
              open={isOpen(c)}
              onToggle={() => toggle(c)}
              extra={
                c.tone === 'sport' && c.state !== 'live' && choices.length > 0 ? (
                  <SportChooser
                    choices={choices}
                    programId={chosen.programId}
                    withRun={chosen.withRun}
                    onChange={(programId, withRun) => setCompose({ programId, withRun })}
                  />
                ) : c.tone === 'guitar' && c.state !== 'live' ? (
                  <Link
                    to="/seance"
                    className="tap t-subhead mx-1 mb-1 flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-guitar/12 font-semibold text-guitar"
                  >
                    <Icon name="target" />
                    Séance guidée
                  </Link>
                ) : undefined
              }
            />
          ))}
        </div>

        <PlateauCard />

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
              <Link to="/plan" className="hit tap inline-flex min-h-11 items-center">
                Voir la semaine
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-2.5">
            {focusOf(v1.profile.reviews, today) && (
              <p className="t-subhead col-span-2 rounded-xl border border-line bg-surface px-4 py-3">
                <span className="t-overline mr-2 text-muted">Focus</span>
                {focusOf(v1.profile.reviews, today)}
              </p>
            )}
            <GoalTile tone="guitar" done={goals.guitar.done} goal={goals.guitar.goal} unit="séances" to="/plan">
              {minutes} min jouées
            </GoalTile>
            <GoalTile tone="sport" done={sportGoal.done} goal={sportGoal.goal} unit="séances" to="/plan">
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
          <button type="button" className="hit tap t-subhead flex min-h-11 items-center text-accent" onClick={() => setSheet(true)}>
            Autre séance ou séance déjà faite
          </button>
        </div>
      </div>
      {sheet && <StartSheet onClose={() => setSheet(false)} />}
    </Screen>
  )
}
