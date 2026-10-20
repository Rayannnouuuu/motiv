import { useAppData } from '../../data/AppDataContext'
import type { IconName } from '../../design/icons'
import { dailyPlan } from '../../domain/dailyPlan'
import { historyOf } from '../../domain/history'
import { plannedOn, type PlannedRun } from '../../domain/marathon/plan'
import { runOf } from '../../domain/marathon/runs'
import { todayQueue, type NextAction, type PlannedToday } from '../../domain/nextAction'
import { upcomingPrograms } from '../../domain/progression'
import { bestBpm } from '../../domain/records'
import { songsOfTheDay } from '../../domain/songSuggestion'
import { sportWeek } from '../../domain/sportWeek'
import { bestGuitarStreak, guitarStreak } from '../../domain/streak'
import { guitarTarget } from '../../domain/targets'
import type { Domain, Program } from '../../domain/types'
import type { Step } from '../../ui/Hero'
import { activeExercises, formatWeight, loadLive, prefillFor, resolveIndex, tracking } from '../log-sport/liveSession'
import { dayLabel, km, paceText, runLabel } from '../marathon/format'
import { useMarathon } from '../marathon/useMarathon'
import { runningPracticeMinutes } from '../practice/practiceSession'
import { planWeekLabel } from '../week/planWeek'

/** Une carte d'Aujourd'hui (Guitare ou Sport) : où en est la discipline aujourd'hui, ses étapes, son bouton. */
export interface DayCard {
  tone: Domain
  state: 'todo' | 'live' | 'done' | 'rest'
  title: string
  subtitle: string
  steps: Step[]
  cta: { label: string; icon: IconName; to: string; state?: object; secondary?: boolean } | null
}

/** Ce que lance « Commencer » au centre de la barre, dans l'ordre. */
export interface QueueItem {
  action: NextAction
  tone: Domain
  /** Une séance déjà commencée : « Reprendre » plutôt que « Commencer ». */
  resume: boolean
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`

/**
 * Aujourd'hui, en deux cartes de même poids : la guitare (exos et morceaux du jour) et le sport (la séance du plan
 * complet : sortie de course et muscu ensemble, ou la séance due de ta rotation sans plan marathon).
 */
export function useToday() {
  const { data, v1, today } = useAppData()
  const mk = useMarathon()
  const guitarLiveMin = runningPracticeMinutes()
  const live = loadLive()
  const liveProgram = live ? data.programs.find((p) => p.id === live.programId) : undefined
  const streak = guitarStreak(data.guitarSessions, today)
  const track = tracking(v1)
  const plan = mk?.plan ?? null
  const race = mk?.m.race.kind ?? 'marathon'

  // Plan complet : la sortie du jour pas encore faite, puis la séance de muscu du jour pas encore faite.
  const sportToday = v1.sessions.filter((s) => s.day === today && s.discipline === 'sport')
  const ranToday = sportToday.some((s) => runOf(s))
  const liftedToday = sportToday.some((s) => !runOf(s))
  const todays = plan ? plannedOn(plan, today) : null
  const run = ranToday ? undefined : todays?.runs.find((r) => r.kind !== 'cross')
  const cross = todays?.runs.find((r) => r.kind === 'cross')
  const lift = liftedToday ? undefined : todays?.strength[0]
  const liftProgram = lift && data.programs.find((p) => p.id === lift.programId)
  const runName = (r: PlannedRun) => `${runLabel(r, race)}${r.km > 0 ? ` ${km(r.km)}` : ''}`
  const planned: PlannedToday | null = run
    ? { label: `Commencer : ${runLabel(run, race)}`, to: '/course', state: { day: run.day, kind: run.kind } }
    : lift
      ? { label: `Commencer : ${lift.name}`, to: '/log/sport', state: { programId: lift.programId } }
      : null

  const queue: QueueItem[] = todayQueue({ data, today, guitarLiveMin, sportLiveProgram: liveProgram?.name ?? null, planned, planActive: plan !== null }).map(
    (action) => ({
      action,
      tone: action.kind === 'resumeGuitar' || action.kind === 'playGuitar' ? 'guitar' : 'sport',
      resume: action.kind === 'resumeSport' || action.kind === 'resumeGuitar',
    }),
  )
  const sportAction = queue.find((q) => q.tone === 'sport')?.action
  const guitarAction = queue.find((q) => q.tone === 'guitar')?.action

  const programSteps = (p: Program, group?: string): Step[] =>
    activeExercises(p).map((e) => {
      const pre = prefillFor(e, track)
      return { title: e.name, detail: `${e.targetSets}×${e.targetReps}${pre.known ? ` · ${formatWeight(pre.weightKg)}` : ''}`, group }
    })

  // Guitare
  const guitarSteps = (): Step[] => {
    const doneToday = new Set(
      data.guitarSessions.filter((s) => s.day === today).flatMap((s) => s.items.flatMap((it) => (it.kind === 'exercise' ? [it.exerciseId] : []))),
    )
    const exos = dailyPlan(data, today).map((ex): Step => {
      const best = bestBpm(data.guitarSessions, ex.id)
      return {
        title: ex.title,
        detail: `${guitarTarget(historyOf(v1.sessions, ex.id), ex.startBpm).bpm} bpm${best !== null ? ` · record ${best}` : ''}`,
        meta: `niv. ${ex.difficulty}`,
        to: `/exo/${ex.id}`,
        done: doneToday.has(ex.id),
      }
    })
    const songs = songsOfTheDay(data.songs, data.guitarSessions, today).map((title): Step => ({
      title,
      detail: 'Morceau du jour',
      to: '/log/guitare',
      state: { songTitle: title },
    }))
    return [...exos, ...songs]
  }
  const guitarSubtitle = () => {
    const r = streak.remainingMin
    if (streak.days > 0) return `Encore ${r} min pour tenir la série de ${plural(streak.days, 'jour', 'jours')}`
    const best = bestGuitarStreak(data.guitarSessions)
    return best > 0 ? `Encore ${r} min · record : ${plural(best, 'jour', 'jours')}` : `${r} min aujourd'hui pour lancer ta série`
  }
  const guitar: DayCard =
    guitarAction?.kind === 'resumeGuitar'
      ? {
          tone: 'guitar',
          state: 'live',
          title: 'Technique et répertoire',
          subtitle: `Chrono en cours · ${guitarLiveMin} min`,
          steps: guitarSteps(),
          cta: { label: 'Reprendre', icon: 'timer', to: '/jouer' },
        }
      : guitarAction
        ? {
            tone: 'guitar',
            state: 'todo',
            title: 'Technique et répertoire',
            subtitle: guitarSubtitle(),
            steps: guitarSteps(),
            cta: { label: 'Commencer', icon: 'play', to: '/jouer', state: { autostart: true } },
          }
        : {
            tone: 'guitar',
            state: 'done',
            title: 'Guitare faite',
            subtitle: `${streak.todayMin} min aujourd'hui · série de ${plural(streak.days, 'jour', 'jours')}`,
            steps: guitarSteps(),
            cta: { label: 'Rejouer avec le chrono', icon: 'play', to: '/jouer', state: { autostart: true }, secondary: true },
          }

  // Sport
  const sport = ((): DayCard => {
    if (sportAction?.kind === 'resumeSport') {
      const exercises = activeExercises(liveProgram)
      const current = live ? resolveIndex(live, exercises) : -1
      return {
        tone: 'sport',
        state: 'live',
        title: liveProgram?.name ?? 'Séance',
        subtitle: 'Séance en cours',
        steps: exercises.map((e, i) => {
          const done = live?.sets.filter((x) => x.programExerciseId === e.id).length ?? 0
          return { title: e.name, detail: `${done}/${e.targetSets} séries${i === current ? ' · en cours' : ''}`, done: done >= e.targetSets }
        }),
        cta: { label: 'Reprendre', icon: 'timer', to: '/log/sport' },
      }
    }
    const doneText = sportToday.map((s) => {
      const r = runOf(s)
      return r ? `Course ${km(r.km)}` : (data.programs.find((p) => p.id === s.templateId)?.name ?? 'Muscu')
    })
    const doneCard: DayCard = { tone: 'sport', state: 'done', title: 'Sport fait', subtitle: doneText.join(' · '), steps: [], cta: null }
    if (plan) {
      const subtitle = `Plan ${race === 'marathon' ? 'marathon' : 'semi'} · ${planWeekLabel(plan)}`
      if (run || lift || (cross && !ranToday)) {
        const steps: Step[] = []
        if (run)
          steps.push({
            title: `Course · ${runLabel(run, race).toLowerCase()}`,
            detail: [run.km > 0 ? km(run.km) : '', run.pace ? paceText(plan.paces, run.pace) : ''].filter(Boolean).join(' · '),
            group: 'Course',
          })
        else if (cross && !ranToday) steps.push({ title: runLabel(cross, race), detail: cross.detail, group: 'Course' })
        if (lift && liftProgram) steps.push(...programSteps(liftProgram, `Muscu · ${lift.name}${lift.light ? ' (léger)' : ''}`))
        const names = [run ? runName(run) : cross && !ranToday ? runLabel(cross, race) : null, lift?.name].filter(Boolean)
        return {
          tone: 'sport',
          state: 'todo',
          title: names.join(' + '),
          subtitle: sportToday.length > 0 ? `${subtitle} · déjà fait : ${doneText.join(', ')}` : subtitle,
          steps,
          cta: planned ? { label: 'Commencer', icon: 'play', to: planned.to, state: planned.state } : null,
        }
      }
      if (sportToday.length > 0) return doneCard
      const ahead = plan.weeks
        .flatMap((w) => [
          ...w.runs.filter((r) => r.kind !== 'cross').map((r) => ({ day: r.day, name: runName(r) })),
          ...w.strength.map((s) => ({ day: s.day, name: s.name })),
        ])
        .filter((x) => x.day > today)
        .sort((a, b) => (a.day < b.day ? -1 : 1))[0]
      return {
        tone: 'sport',
        state: 'rest',
        title: 'Repos',
        subtitle: ahead ? `Prochaine séance ${dayLabel(ahead.day)} : ${ahead.name}` : subtitle,
        steps: [],
        cta: null,
      }
    }
    if (sportAction?.kind === 'startSport') {
      const [next] = upcomingPrograms(data.programs, data.sportSessions, 1)
      const week = sportWeek(data.sportSessions, today)
      return {
        tone: 'sport',
        state: 'todo',
        title: next.name,
        subtitle: `Séance ${week.done + 1} sur ${week.done + week.remaining} de la semaine`,
        steps: programSteps(next),
        cta: { label: 'Commencer', icon: 'play', to: '/log/sport', state: { programId: next.id } },
      }
    }
    if (sportToday.length > 0) return doneCard
    if (data.programs.length === 0)
      return {
        tone: 'sport',
        state: 'rest',
        title: 'Pas encore de programme',
        subtitle: 'Choisis ta muscu (Push / Pull / Legs…) ou prépare une course depuis Moi.',
        steps: [],
        cta: { label: 'Choisir ton programme', icon: 'plus', to: '/bibliotheque?vue=modeles', secondary: true },
      }
    const [next] = upcomingPrograms(data.programs, data.sportSessions, 1)
    return {
      tone: 'sport',
      state: 'rest',
      title: sportWeek(data.sportSessions, today).remaining === 0 ? 'Semaine validée' : 'Repos',
      subtitle: next ? `Prochaine séance : ${next.name}` : '',
      steps: [],
      cta: null,
    }
  })()

  return { queue, guitar, sport, streak, mk }
}
