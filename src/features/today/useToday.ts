import { useAppData } from '../../data/AppDataContext'
import { dailyPlan } from '../../domain/dailyPlan'
import { historyOf } from '../../domain/history'
import { plannedOn } from '../../domain/marathon/plan'
import { doneRuns } from '../../domain/marathon/runs'
import { RUNNER_TEMPLATE_ID, runnerMoves } from '../../domain/marathon/strength'
import { todayQueue, type NextAction, type PlannedToday } from '../../domain/nextAction'
import { upcomingPrograms } from '../../domain/progression'
import { bestBpm } from '../../domain/records'
import { songsOfTheDay } from '../../domain/songSuggestion'
import { sportWeek } from '../../domain/sportWeek'
import { bestGuitarStreak, guitarStreak } from '../../domain/streak'
import { guitarTarget } from '../../domain/targets'
import type { Domain } from '../../domain/types'
import type { Step } from '../../ui/Hero'
import { activeExercises, formatWeight, loadLive, prefillFor, resolveIndex, tracking } from '../log-sport/liveSession'
import { km, paceText, runLabel } from '../marathon/format'
import { useMarathon } from '../marathon/useMarathon'
import { runningPracticeMinutes } from '../practice/practiceSession'
import { planWeekLabel } from '../week/planWeek'

/** Une séance du jour telle qu'Aujourd'hui la montre : son univers, son nom, ses étapes, et où elle mène. */
export interface SessionView {
  action: NextAction
  tone: Domain
  title: string
  subtitle: string
  steps: Step[]
  /** Une séance déjà commencée : « Reprendre » plutôt que « Commencer ». */
  resume: boolean
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`

/**
 * Les séances du jour dans l'ordre (la première est la prochaine, celle que lance « Commencer »), avec ce qu'il
 * faut pour les afficher. Les séances déjà commencées passent devant.
 */
export function useToday() {
  const { data, v1, today } = useAppData()
  const mk = useMarathon()
  const guitarLiveMin = runningPracticeMinutes()
  const live = loadLive()

  const streak = guitarStreak(data.guitarSessions, today)
  const liveProgram = live ? data.programs.find((p) => p.id === live.programId) : undefined

  // Plan marathon : la sortie du jour pas encore faite, sinon le renfo du jour pas encore fait.
  const todays = mk?.plan ? plannedOn(mk.plan, today) : null
  const runDone = doneRuns(v1.sessions).some((r) => r.day === today)
  const strengthDone = v1.sessions.some((s) => s.day === today && s.templateId === RUNNER_TEMPLATE_ID)
  const run = runDone ? undefined : todays?.runs.find((r) => r.kind !== 'cross')
  const strength = strengthDone ? undefined : todays?.strength[0]
  const race = mk?.m.race.kind ?? 'marathon'
  const planned: PlannedToday | null = run
    ? { label: `Commencer : ${runLabel(run, race)}`, to: '/course', state: { day: run.day, kind: run.kind } }
    : strength
      ? { label: 'Commencer : renfo coureur', to: '/log/sport', state: { programId: RUNNER_TEMPLATE_ID } }
      : null

  const queue = todayQueue({ data, today, guitarLiveMin, sportLiveProgram: liveProgram?.name ?? null, planned })

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

  const view = (a: NextAction): SessionView => {
    const base = { action: a, resume: a.kind === 'resumeSport' || a.kind === 'resumeGuitar' }
    switch (a.kind) {
      case 'resumeSport': {
        const exercises = activeExercises(liveProgram)
        const current = live ? resolveIndex(live, exercises) : -1
        return {
          ...base,
          tone: 'sport',
          title: liveProgram?.name ?? 'Séance',
          subtitle: 'Séance en cours',
          steps: exercises.map((e, i) => {
            const done = live?.sets.filter((x) => x.programExerciseId === e.id).length ?? 0
            return { title: e.name, detail: `${done}/${e.targetSets} séries${i === current ? ' · en cours' : ''}`, done: done >= e.targetSets }
          }),
        }
      }
      case 'resumeGuitar':
      case 'playGuitar':
        return {
          ...base,
          tone: 'guitar',
          title: 'Technique et répertoire',
          subtitle: a.kind === 'resumeGuitar' ? `Chrono en cours · ${guitarLiveMin} min` : guitarSubtitle(),
          steps: guitarSteps(),
        }
      case 'startPlanned': {
        const gym = mk?.m.constraints.gym ?? true
        const steps: Step[] = []
        if (run)
          steps.push({
            title: `Course · ${runLabel(run, race).toLowerCase()}`,
            detail: [run.km > 0 ? km(run.km) : '', run.pace && mk?.plan ? paceText(mk.plan.paces, run.pace) : ''].filter(Boolean).join(' · '),
          })
        if (strength)
          steps.push({
            title: `Renfo coureur${strength.light ? ' léger' : ''}`,
            detail: runnerMoves(gym)
              .slice(0, 4)
              .map((m) => m.name.toLowerCase())
              .join(', '),
            to: '/log/sport',
            state: { programId: RUNNER_TEMPLATE_ID },
          })
        const name = run ? `${runLabel(run, race)}${run.km > 0 ? ` ${km(run.km)}` : ''}` : 'Renfo coureur'
        return {
          ...base,
          tone: 'sport',
          title: run && strength ? `${name} + renfo` : name,
          subtitle: mk?.plan ? `Plan ${race === 'marathon' ? 'marathon' : 'semi'} · ${planWeekLabel(mk.plan)}` : '',
          steps,
        }
      }
      case 'startSport': {
        const [next] = upcomingPrograms(data.programs, data.sportSessions, 1)
        const week = sportWeek(data.sportSessions, today)
        const track = tracking(v1)
        return {
          ...base,
          tone: 'sport',
          title: next.name,
          subtitle: `Séance ${week.done + 1} sur ${week.done + week.remaining} de la semaine`,
          steps: activeExercises(next).map((e) => {
            const p = prefillFor(e, track)
            return { title: e.name, detail: `${e.targetSets}×${e.targetReps}${p.known ? ` · ${formatWeight(p.weightKg)}` : ''}` }
          }),
        }
      }
      default:
        throw new Error(`séance inconnue : ${a.kind}`)
    }
  }

  return { queue: queue.map(view), streak, mk }
}
