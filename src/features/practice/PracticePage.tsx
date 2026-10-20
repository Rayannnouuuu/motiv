import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getExercise } from '../../content/exercises'
import { useAppData } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { dailyPlan } from '../../domain/dailyPlan'
import { todayParis } from '../../domain/date'
import { bestBpm } from '../../domain/records'
import { guitarStreak } from '../../domain/streak'
import { Button } from '../../ui/Button'
import { Fireworks } from '../../ui/Fireworks'
import { RowChevron } from '../../ui/List'
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

/** Exos et morceaux cochés, au format du log guitare. */
function toEntries(s: PracticeState, best: (id: string) => number | null, songIds: Set<string>): Entry[] {
  const exercises: Entry[] = s.exercises
    .filter((id) => getExercise(id))
    .map((id) => {
      // Tempo joué au métronome pendant la séance, sinon le record.
      const b = s.bpms?.[id] ?? best(id)
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
  // Objectif du jour de la séance : 60 min si la veille était un jour court, sinon 30.
  const { todayMin: loggedMin, targetMin } = guitarStreak(data.guitarSessions, sessionDay)
  const elapsed = session ? elapsedMs(session, now) : 0
  const total = Math.min(targetMin, loggedMin + Math.floor(elapsed / 60_000))
  // L'objectif franchi pendant cette séance (pas avant) : une seule fête, mémorisée avec la séance.
  const crossed = session !== null && !stale && !loading && loggedMin < targetMin && total >= targetMin
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

  const bar = (
    <ModalBar
      tone="guitar"
      onCancel={() => navigate('/')}
      cancelLabel="Fermer"
      cancelAria="Fermer"
      title={
        <span className="flex items-center justify-center gap-1.5">
          <Icon name="guitar" className="text-guitar" />
          Guitare
        </span>
      }
    />
  )

  if (!session)
    return (
      <div className="flex flex-1 flex-col">
        {bar}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <p className="t-body text-muted">
            {loggedMin >= targetMin ? "Objectif du jour atteint. Encore un peu ?" : `${targetMin - loggedMin} min aujourd'hui pour tenir la série`}
          </p>
          <button
            type="button"
            onClick={() => {
              haptic()
              setSession(startPractice(new Date(), crypto.randomUUID()))
            }}
            className="tap-scale t-title2 flex size-40 items-center justify-center gap-1.5 rounded-full bg-guitar text-on-guitar shadow-glow shadow-guitar/35"
          >
            <Icon name="play" />
            Démarrer
          </button>
        </div>
      </div>
    )

  if (stale) {
    // En pause, le temps est figé : ses minutes sont exactes et se gardent. Sinon on ne sait pas quand il s'est arrêté.
    const pausedMin = session.pausedAt !== null ? logMinutes(session, now) : null
    return (
      <div className="flex flex-1 flex-col">
        {bar}
        <div className="flex flex-1 flex-col justify-center gap-3 text-center">
          <Icon name="timer" size="3em" className="self-center text-guitar" />
          <p className="t-title3 pb-3">
            {pausedMin !== null
              ? `Une séance restée en pause n'a pas été enregistrée : ${pausedMin} min jouées.`
              : "Une séance commencée il y a plus de 12 h n'a pas été terminée."}
          </p>
          <Button tone="guitar" onClick={() => toLog(session, { durationMin: pausedMin })}>
            {pausedMin !== null ? `Logger ${pausedMin} min` : 'Logger sans durée'}
          </Button>
          <Button variant="ghost" tone="danger" onClick={abandon}>
            Abandonner
          </Button>
        </div>
      </div>
    )
  }

  const paused = session.pausedAt !== null
  // En pause depuis la veille : reprendre compterait le jeu d'aujourd'hui pour hier (la séance garde son jour de départ).
  const fromYesterday = paused && sessionDay !== today
  const plan = dailyPlan(data, today)

  return (
    <div className="flex flex-1 flex-col gap-6">
      {bar}

      <div className="flex flex-col items-center">
        <ProgressRing value={total} max={targetMin} size={220} stroke={14} color="guitar">
          <span className="flex flex-col items-center gap-0.5">
            <span
              role="timer"
              aria-label="Temps joué"
              className={`${elapsed >= HOUR_MS ? 't-display-sm' : 't-display'} tracking-normal tabular-nums transition-colors ${paused ? 'text-muted' : ''}`}
            >
              {formatClock(elapsed)}
            </span>
            {total >= targetMin ? (
              <span className="t-footnote flex items-center gap-0.5 font-semibold text-guitar">
                Série tenue
                <Icon name="check" />
              </span>
            ) : (
              <span className="t-footnote text-muted tabular-nums">
                {total}/{targetMin} min {sessionDay === today ? "aujourd'hui" : 'hier'}
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
        <ul className="rows overflow-hidden rounded-lg bg-surface">
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
                  className={`hit tap-scale flex size-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                    done ? 'bg-guitar text-on-guitar' : 'border-[1.5px] border-faint'
                  }`}
                >
                  {done && <Icon name="check" size="1em" />}
                </button>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={`t-headline truncate ${done ? 'text-muted' : ''}`}>{ex.title}</span>
                  <span className="t-footnote text-muted tabular-nums">
                    Cible {ex.targetBpm} bpm{record !== null && ` · record ${record}`}
                  </span>
                </span>
                <Link to={`/exo/${ex.id}`} aria-label={`Tablature : ${ex.title}`} className="tap -my-2.5 -mr-3.5 flex min-w-11 items-center justify-center self-stretch px-4">
                  <RowChevron />
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
                    className={`hit tap-scale t-footnote flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors duration-200 ${on ? 'bg-guitar font-semibold text-on-guitar' : 'bg-fill'}`}
                  >
                    <Icon name="song" />
                    {s.title}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="mt-auto flex flex-col gap-2">
        {fromYesterday && (
          <p className="t-footnote px-4 text-center text-muted">Commencée hier : termine-la pour l'enregistrer sur hier, puis relance un chrono pour aujourd'hui.</p>
        )}
        <div className="flex gap-2.5">
          {!fromYesterday && (
            <Button
              variant="secondary"
              tone="guitar"
              className="flex-1"
              onClick={() => {
                const at = new Date()
                setNow(at)
                dispatch({ type: paused ? 'resume' : 'pause', at })
              }}
            >
              <Icon name={paused ? 'play' : 'pause'} />
              {paused ? 'Reprendre' : 'Pause'}
            </Button>
          )}
          <Button tone="guitar" className="flex-1" onClick={finish}>
            Terminer
          </Button>
        </div>
        {confirmAbandon ? (
          <Button variant="ghost" tone="danger" onClick={abandon}>
            Oui, abandonner (rien n'est enregistré)
          </Button>
        ) : (
          <button type="button" className="hit tap t-subhead self-center py-1.5 text-danger" onClick={() => setConfirmAbandon(true)}>
            Abandonner
          </button>
        )}
      </div>

      {celebrate && <Fireworks size="small" onDone={() => setCelebrate(false)} />}
    </div>
  )
}
