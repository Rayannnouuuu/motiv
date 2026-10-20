import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useActions } from '../../data/AppDataContext'
import { Icon } from '../../design/icons'
import { noteOf } from '../../domain/note'
import { CHRONO_LABELS } from '../../domain/marathon/profile'
import { formatDuration } from '../../domain/marathon/paces'
import { plannedOn, type PlannedRun, type RunKind } from '../../domain/marathon/plan'
import type { Rating } from '../../domain/types'
import { Button } from '../../ui/Button'
import { ModalBar } from '../../ui/ModalBar'
import { SessionFeedback } from '../../ui/SessionFeedback'
import { SessionTitle } from '../../ui/SessionTitle'
import { beep, primeBeep } from '../log-sport/beep'
import { elapsedMs, formatClock } from '../practice/practiceSession'
import { km, paceText, runLabel } from './format'
import { clock, loadRun, saveRun, segmentAt, type RunState } from './runSession'
import { useMarathon } from './useMarathon'

const INPUT = 't-body min-h-11 w-20 rounded-sm bg-fill px-2 py-1.5 text-right tabular-nums outline-none'

/** Fin de sortie : distance et durée saisies, douleur de 0 à 10, puis les deux notes et la note libre. */
function FinishRun({ run, planned, onBack }: { run: RunState; planned: PlannedRun | null; onBack: () => void }) {
  const { saveRun: save } = useActions()
  const navigate = useNavigate()
  const [sec] = useState(() => Math.round(elapsedMs(run, new Date()) / 1000))
  const [dist, setDist] = useState(run.km > 0 ? String(run.km).replace('.', ',') : '')
  const [min, setMin] = useState(String(Math.floor(sec / 60)))
  const [s, setS] = useState(String(sec % 60))
  const [pain, setPain] = useState(0)
  const [flow, setFlow] = useState<Rating | null>(null)
  const [desire, setDesire] = useState<Rating | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const k = Number(dist.replace(',', '.'))
  const total = Number(min) * 60 + Number(s || 0)
  const valid = k > 0 && k <= 100 && Number.isInteger(Number(min)) && total > 0 && total <= 10 * 3600

  async function finish() {
    if (!valid || flow === null || desire === null) return
    setSaving(true)
    try {
      const result = await save({
        id: run.id,
        day: run.day,
        km: k,
        sec: total,
        durationMin: Math.max(1, Math.round(total / 60)),
        pain,
        flowRating: flow,
        desireRating: desire,
        ...noteOf(note),
      })
      saveRun(null)
      const notice = result.chrono
        ? `Nouveau chrono de référence : ${CHRONO_LABELS[result.chrono.distance]} en ${formatDuration(result.chrono.sec)}. Tes allures sont recalculées.`
        : undefined
      navigate('/xp', { replace: true, state: { result, domain: 'sport', logId: run.id, ...(notice ? { notice } : {}) } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <ModalBar tone="sport" back onCancel={onBack} cancelLabel="Course" cancelAria="Revenir à la course" />
      <h1 className="t-title1">Sortie terminée</h1>
      {planned && <p className="t-subhead -mt-4 text-muted">Prévu : {km(planned.km)}</p>}
      <div className="rows overflow-hidden rounded-md bg-surface">
        <label className="flex min-h-11 items-center justify-between gap-2 px-4 py-1.5">
          <span className="t-body flex-1">Distance</span>
          <input inputMode="decimal" aria-label="Distance en km" value={dist} onChange={(e) => setDist(e.target.value)} className={INPUT} />
          <span className="t-subhead w-8 text-muted">km</span>
        </label>
        <div className="flex min-h-11 items-center justify-between gap-2 px-4 py-1.5">
          <span className="t-body flex-1">Durée</span>
          <input inputMode="numeric" aria-label="Durée, minutes" value={min} onChange={(e) => setMin(e.target.value)} className={`${INPUT} w-16`} />
          <span className="t-subhead text-muted">min</span>
          <input inputMode="numeric" aria-label="Durée, secondes" value={s} onChange={(e) => setS(e.target.value)} className={`${INPUT} w-14`} />
          <span className="t-subhead text-muted">s</span>
        </div>
      </div>
      <label className="flex flex-col gap-2">
        <span className="t-headline flex justify-between">
          Douleur <span className="tabular-nums">{pain}/10</span>
        </span>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={pain}
          aria-label="Douleur de 0 à 10"
          onChange={(e) => setPain(Number(e.target.value))}
          className="accent-[var(--sport)]"
        />
        <span className="t-footnote text-muted">Au-dessus de 3, ou deux sorties de suite avec une douleur : la progression se met en pause.</span>
      </label>
      <SessionFeedback tone="sport" flow={flow} desire={desire} note={note} onFlow={setFlow} onDesire={setDesire} onNote={setNote} />
      {error && (
        <p role="alert" className="t-subhead text-danger">
          {error}
        </p>
      )}
      <Button tone="sport" disabled={!valid || flow === null || desire === null || saving} onClick={finish}>
        Enregistrer
      </Button>
    </div>
  )
}

/**
 * Séance de course (lot 3) : l'allure cible et le chrono ; pour le fractionné, le seuil et la course-marche,
 * un minuteur d'intervalles avec des bips (le bip du repos sport : il ne coupe pas ta musique).
 */
export function RunPage() {
  const mk = useMarathon()
  const navigate = useNavigate()
  const asked = useLocation().state as { day?: string; kind?: RunKind } | null
  const [run, setRun] = useState<RunState | null>(() => loadRun())
  const [now, setNow] = useState(() => new Date())
  const [finishing, setFinishing] = useState(false)
  const day = run?.day ?? asked?.day ?? mk?.today ?? ''
  const kind = run?.kind ?? asked?.kind
  const planned = (mk?.plan && day && plannedOn(mk.plan, day).runs.find((r) => r.kind === kind)) || null
  const segments = planned?.segments ?? []
  const running = run !== null && run.pausedAt === null && !finishing
  const sec = run ? Math.floor(elapsedMs(run, now) / 1000) : 0
  const seg = segmentAt(segments, sec)
  const lastSeg = useRef<number | null>(null)

  useEffect(() => saveRun(run), [run])
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [running])
  // Un bip à chaque changement de bloc, et à la fin du dernier.
  const segIndex = seg?.index ?? (segments.length > 0 && run ? -1 : null)
  useEffect(() => {
    if (segIndex === null) return
    if (lastSeg.current !== null && lastSeg.current !== segIndex) beep()
    lastSeg.current = segIndex
  }, [segIndex])

  if (finishing && run) return <FinishRun run={run} planned={planned} onBack={() => setFinishing(false)} />

  const title = planned && mk ? runLabel(planned, mk.m.race.kind) : 'Course libre'
  const start = () => {
    primeBeep()
    setNow(new Date())
    setRun({ id: crypto.randomUUID(), day, kind: kind ?? 'easy', km: planned?.km ?? 0, startedAt: new Date().toISOString(), pausedAt: null, pausedMs: 0 })
  }
  const togglePause = () => {
    const at = new Date()
    setNow(at)
    setRun(
      (r) =>
        r &&
        (r.pausedAt === null
          ? { ...r, pausedAt: at.toISOString() }
          : { ...r, pausedAt: null, pausedMs: r.pausedMs + (at.getTime() - new Date(r.pausedAt).getTime()) }),
    )
  }
  const abandon = () => {
    saveRun(null)
    navigate(-1)
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <ModalBar
        tone="sport"
        onCancel={() => (run ? navigate(-1) : abandon())}
        cancelLabel="Fermer"
        cancelAria="Fermer"
        title={run ? <SessionTitle name={title} elapsedMs={(t) => elapsedMs(run, t)} /> : title}
      />
      <div className="flex flex-col gap-1">
        <h1 className="t-title1">{title}</h1>
        {planned && (
          <>
            <p className="t-body text-muted">
              {planned.km > 0 && `${km(planned.km)} · `}
              {planned.detail}
            </p>
            {planned.pace && mk?.plan && (
              <p className="t-headline text-sport">
                <Icon name="target" /> {paceText(mk.plan.paces, planned.pace)}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 py-4">
        <p role="timer" aria-label="Temps de course" className={`t-display tabular-nums ${run?.pausedAt ? 'text-muted' : ''}`}>
          {formatClock(sec * 1000)}
        </p>
        {run && seg && (
          <div className="flex flex-col items-center gap-1" aria-live="polite">
            <p className="t-title2 text-sport">{segments[seg.index].label}</p>
            <p className="t-title3 tabular-nums">encore {clock(seg.left)}</p>
            {segments[seg.index + 1] && (
              <p className="t-subhead text-muted">
                Ensuite : {segments[seg.index + 1].label} ({clock(segments[seg.index + 1].sec)})
              </p>
            )}
          </div>
        )}
        {run && segments.length > 0 && !seg && <p className="t-headline text-sport">Tous les blocs sont faits.</p>}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        {!run ? (
          <Button tone="sport" onClick={start}>
            <Icon name="play" />
            Démarrer
          </Button>
        ) : (
          <div className="flex gap-2.5">
            <Button variant="secondary" tone="sport" className="flex-1" onClick={togglePause}>
              <Icon name={run.pausedAt ? 'play' : 'pause'} />
              {run.pausedAt ? 'Reprendre' : 'Pause'}
            </Button>
            <Button
              tone="sport"
              className="flex-1"
              onClick={() => {
                if (run.pausedAt === null) togglePause()
                setFinishing(true)
              }}
            >
              Terminer
            </Button>
          </div>
        )}
        {run && (
          <button type="button" className="hit tap t-subhead self-center py-1.5 text-danger" onClick={abandon}>
            Abandonner (rien n'est enregistré)
          </button>
        )}
      </div>
    </div>
  )
}
