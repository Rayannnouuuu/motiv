import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getExercise } from '../../content/exercises'
import { useAppData } from '../../data/AppDataContext'
import { dailyPlan } from '../../domain/dailyPlan'
import { todayParis } from '../../domain/date'
import { bestBpm } from '../../domain/records'
import { GUITAR_DAILY_MIN, guitarStreak } from '../../domain/streak'
import { Button } from '../../ui/Button'
import { Fireworks } from '../../ui/Fireworks'
import { ModalBar } from '../../ui/ModalBar'
import { ProgressRing } from '../../ui/ProgressRing'
import { haptic } from '../../ui/spring'
import type { Entry } from '../log-guitar/StepContent'
import {
  elapsedMs,
  formatClock,
  isStale,
  loadPractice,
  logMinutes,
  practiceReducer,
  savePractice,
  startPractice,
  type PracticeAction,
  type PracticeState,
} from './practiceSession'

const HOUR_MS = 3_600_000

function Chevron() {
  return (
    <svg width="8" height="13" viewBox="0 0 8 13" className="shrink-0 text-faint" aria-hidden>
      <path d="M1.5 1.5 6.5 6.5 1.5 11.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M2.5 7.5 5.5 10.5 11.5 3.5" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Exos et morceaux cochés, au format du log guitare. */
function toEntries(s: PracticeState, best: (id: string) => number | null, songIds: Set<string>): Entry[] {
  const exercises: Entry[] = s.exercises
    .filter((id) => getExercise(id))
    .map((id) => {
      const b = best(id)
      return { kind: 'exercise', exerciseId: id, bpm: b === null ? '' : String(b) }
    })
  const songs: Entry[] = s.songs.filter((id) => songIds.has(id)).map((id) => ({ kind: 'song', songId: id, mastered: false }))
  return [...exercises, ...songs]
}

/** Chrono de guitare : le temps qui passe, l'objectif du jour qui se remplit, les exos qu'on coche en jouant. */
export function PracticePage() {
  const { data, today, loading } = useAppData()
  const navigate = useNavigate()
  const nav = useLocation().state as { autostart?: unknown } | null
  // En StrictMode l'initialiseur peut tourner deux fois : seul l'état retenu est sauvegardé (effet ci-dessous).
  const [session, setSession] = useState<PracticeState | null>(
    () => loadPractice() ?? (nav?.autostart ? startPractice(new Date(), crypto.randomUUID()) : null),
  )
  const [now, setNow] = useState(() => new Date())
  // Recalculé à chaque instant (et au retour de l'appli, voir plus bas) : une séance de plus de 12 h,
  // même reprise sans rechargement par iOS, demande quoi en faire au lieu d'enregistrer des heures.
  const stale = session !== null && isStale(session, now)
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => savePractice(session), [session])

  // autostart consommé : un retour arrière vers cette page ne relance pas de chrono.
  useEffect(() => {
    if (nav?.autostart) navigate('.', { replace: true })
    // Une seule fois, à l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Retour au premier plan (même en pause) : l'heure est remise à jour, ce qui réévalue la péremption.
  useEffect(() => {
    const wake = () => document.visibilityState === 'visible' && setNow(new Date())
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('pageshow', wake)
    return () => {
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('pageshow', wake)
    }
  }, [])

  // Tic d'une seconde, seulement quand le chrono tourne et que la page est visible.
  const running = session !== null && session.pausedAt === null && !stale
  useEffect(() => {
    if (!running) return
    let timer: number | undefined
    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer)
      timer = undefined
    }
    const sync = () => {
      if (document.visibilityState === 'hidden') return stop()
      setNow(new Date())
      if (timer === undefined) timer = window.setInterval(() => setNow(new Date()), 1000)
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [running])

  // Une séance commencée avant minuit compte pour son jour de départ (c'est là qu'elle sera enregistrée).
  const sessionDay = session ? todayParis(new Date(session.startedAt)) : today
  const loggedMin = guitarStreak(data.guitarSessions, sessionDay).todayMin
  const elapsed = session ? elapsedMs(session, now) : 0
  const total = Math.min(GUITAR_DAILY_MIN, loggedMin + Math.floor(elapsed / 60_000))
  // Les 60 min franchies pendant cette séance (pas avant) : une seule fête, mémorisée avec la séance.
  const crossed = session !== null && !stale && !loading && loggedMin < GUITAR_DAILY_MIN && total >= GUITAR_DAILY_MIN
  const alreadyCelebrated = session?.goalCelebrated ?? true
  useEffect(() => {
    if (!crossed || alreadyCelebrated) return
    setSession((s) => (s ? practiceReducer(s, { type: 'celebrated' }) : s))
    setCelebrate(true)
    haptic('success')
  }, [crossed, alreadyCelebrated])

  const dispatch = (a: PracticeAction) => setSession((s) => (s ? practiceReducer(s, a) : s))
  const best = (id: string) => bestBpm(data.guitarSessions, id)
  const learning = data.songs.filter((s) => s.status === 'learning').sort((a, b) => a.title.localeCompare(b.title, 'fr'))
  const songIds = new Set(data.songs.map((s) => s.id))

  // Écrit tout de suite : la page est démontée par la navigation avant l'effet.
  const abandon = () => {
    savePractice(null)
    setSession(null)
    navigate('/')
  }
  const toLog = (s: PracticeState, extra: { durationMin: number | null; step?: 2 }) =>
    navigate('/log/guitare', {
      state: { ...extra, entries: toEntries(s, best, songIds), day: todayParis(new Date(s.startedAt)), practiceId: s.id },
    })
  const finish = () => {
    if (!session) return
    const at = new Date()
    const paused = practiceReducer(session, { type: 'pause', at })
    savePractice(paused)
    setSession(paused)
    toLog(paused, { durationMin: logMinutes(paused, at), step: 2 })
  }

  const bar = <ModalBar onCancel={() => navigate('/')} cancelLabel="Fermer" cancelAria="Fermer" title="🎸 Guitare" />

  if (!session)
    return (
      <div className="flex flex-1 flex-col">
        {bar}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <p className="t-body text-muted">
            {loggedMin >= GUITAR_DAILY_MIN ? "Objectif du jour atteint. Encore un peu ?" : `${GUITAR_DAILY_MIN - loggedMin} min aujourd'hui pour tenir la série`}
          </p>
          <button
            type="button"
            onClick={() => {
              haptic()
              setSession(startPractice(new Date(), crypto.randomUUID()))
            }}
            className="tap-scale t-title2 flex h-40 w-40 items-center justify-center rounded-full bg-guitar text-white shadow-[0_10px_28px_color-mix(in_srgb,var(--guitar)_35%,transparent)]"
          >
            ▶︎ Démarrer
          </button>
        </div>
      </div>
    )

  if (stale)
    return (
      <div className="flex flex-1 flex-col">
        {bar}
        <div className="flex flex-1 flex-col justify-center gap-3 text-center">
          <p className="text-[3rem]" aria-hidden>
            ⏱️
          </p>
          <p className="t-title3 pb-3">Une séance commencée il y a plus de 12 h n'a pas été terminée.</p>
          <Button onClick={() => toLog(session, { durationMin: null })}>Logger sans durée</Button>
          <Button variant="ghost" className="!text-danger" onClick={abandon}>
            Abandonner
          </Button>
        </div>
      </div>
    )

  const paused = session.pausedAt !== null
  const plan = dailyPlan(data, today)

  return (
    <div className="flex flex-1 flex-col gap-6">
      {bar}

      <div className="flex flex-col items-center">
        <ProgressRing value={total} max={GUITAR_DAILY_MIN} size={220} stroke={14} color="guitar">
          <span className="flex flex-col items-center gap-0.5">
            <span
              role="timer"
              aria-label="Temps joué"
              className={`${elapsed >= HOUR_MS ? 'text-[2.75rem]' : 'text-[3.5rem]'} leading-none font-bold tabular-nums transition-colors ${paused ? 'text-muted' : ''}`}
            >
              {formatClock(elapsed)}
            </span>
            {total >= GUITAR_DAILY_MIN ? (
              <span className="t-footnote font-semibold text-guitar">Série tenue ✓</span>
            ) : (
              <span className="t-footnote text-muted tabular-nums">
                {total}/{GUITAR_DAILY_MIN} min {sessionDay === today ? "aujourd'hui" : 'hier'}
              </span>
            )}
          </span>
        </ProgressRing>
        {paused && <p className="t-footnote pt-2 font-semibold text-muted uppercase">En pause</p>}
      </div>

      <section className="flex flex-col gap-2" aria-labelledby="practice-plan">
        <h2 id="practice-plan" className="t-footnote px-1 font-semibold text-muted uppercase">
          Séance du jour
        </h2>
        <ul className="rows overflow-hidden rounded-[0.875rem] bg-surface">
          {plan.map((ex) => {
            const done = session.exercises.includes(ex.id)
            const record = best(ex.id)
            return (
              <li key={ex.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <button
                  type="button"
                  aria-pressed={done}
                  aria-label={`Fait : ${ex.title}`}
                  onClick={() => {
                    haptic()
                    dispatch({ type: 'toggleExercise', id: ex.id })
                  }}
                  className={`tap-scale flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                    done ? 'bg-guitar' : 'border-[1.5px] border-faint'
                  }`}
                >
                  {done && <Check />}
                </button>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={`t-headline truncate ${done ? 'text-muted' : ''}`}>{ex.title}</span>
                  <span className="t-footnote text-muted tabular-nums">
                    Cible {ex.targetBpm} bpm{record !== null && ` · record ${record}`}
                  </span>
                </span>
                <Link to={`/exo/${ex.id}`} aria-label={`Tablature : ${ex.title}`} className="tap -my-2.5 -mr-3.5 flex items-center self-stretch px-4">
                  <Chevron />
                </Link>
              </li>
            )
          })}
        </ul>

        {learning.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Morceaux en cours">
            {learning.map((s) => {
              const on = session.songs.includes(s.id)
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      haptic()
                      dispatch({ type: 'toggleSong', id: s.id })
                    }}
                    className={`tap-scale t-footnote rounded-full px-3 py-1.5 transition-colors duration-200 ${on ? 'bg-guitar font-semibold text-white' : 'bg-fill'}`}
                  >
                    🎵 {s.title}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="mt-auto flex flex-col gap-2">
        <div className="flex gap-2.5">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              const at = new Date()
              setNow(at)
              dispatch({ type: paused ? 'resume' : 'pause', at })
            }}
          >
            {paused ? 'Reprendre' : 'Pause'}
          </Button>
          <Button className="flex-1" onClick={finish}>
            Terminer
          </Button>
        </div>
        {confirmAbandon ? (
          <Button variant="ghost" className="!text-danger" onClick={abandon}>
            Oui, abandonner (rien n'est enregistré)
          </Button>
        ) : (
          <button type="button" className="tap t-subhead self-center py-1.5 text-danger" onClick={() => setConfirmAbandon(true)}>
            Abandonner
          </button>
        )}
      </div>

      {celebrate && <Fireworks size="small" onDone={() => setCelebrate(false)} />}
    </div>
  )
}
