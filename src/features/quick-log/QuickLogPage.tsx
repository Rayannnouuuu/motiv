import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useActions, useAppData } from '../../data/AppDataContext'
import { addDays } from '../../domain/date'
import { nextProgram } from '../../domain/progression'
import type { Domain, Rating } from '../../domain/types'
import { Button } from '../../ui/Button'
import { ModalBar } from '../../ui/ModalBar'
import { Segmented } from '../../ui/Segmented'
import { noteOf } from '../../domain/note'
import { SessionFeedback } from '../../ui/SessionFeedback'

const MAX_DURATION = 600
const DEFAULT_MIN: Record<Domain, string> = { guitar: '30', sport: '60' }

/**
 * Log rapide (moins de 20 s) : discipline, jour, durée, séance (sport) et les deux notes. Pour la guitare,
 * « Détailler » ouvre le log complet (exos et morceaux).
 */
export function QuickLogPage() {
  const { data, today } = useAppData()
  const actions = useActions()
  const navigate = useNavigate()
  const asked = (useLocation().state as { discipline?: unknown } | null)?.discipline
  const [discipline, setDiscipline] = useState<Domain>(asked === 'sport' ? 'sport' : 'guitar')
  const [yesterday, setYesterday] = useState(false)
  const [duration, setDuration] = useState(DEFAULT_MIN[discipline])
  const programs = data.programs.filter((p) => !p.archived).sort((a, b) => a.position - b.position)
  const [programId, setProgramId] = useState(() => nextProgram(data.programs, data.sportSessions)?.id ?? programs[0]?.id ?? '')
  const [flow, setFlow] = useState<Rating | null>(null)
  const [desire, setDesire] = useState<Rating | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const min = Number(duration)
  const validDuration = Number.isInteger(min) && min > 0 && min <= MAX_DURATION
  const program = programs.find((p) => p.id === programId)
  const ready = validDuration && flow !== null && desire !== null && (discipline === 'guitar' || program !== undefined)

  async function save() {
    if (!ready || flow === null || desire === null) return
    setSaving(true)
    setError(null)
    const id = crypto.randomUUID()
    const day = yesterday ? addDays(today, -1) : today
    const common = { id, day, durationMin: min, flowRating: flow, desireRating: desire, ...noteOf(note) }
    try {
      const result =
        discipline === 'guitar'
          ? await actions.saveGuitarSession({ ...common, items: [], newSongs: [] })
          : await actions.saveSportSession({ ...common, programId, sets: [] })
      navigate('/xp', { replace: true, state: { result, domain: discipline, logId: id } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <ModalBar tone={discipline} onCancel={() => navigate(-1)} title="Noter une séance" />
      <Segmented
        label="Discipline"
        options={[
          { value: 'guitar', label: 'Guitare' },
          { value: 'sport', label: 'Sport' },
        ]}
        value={discipline}
        onChange={(d) => {
          setDiscipline(d)
          setDuration(DEFAULT_MIN[d])
        }}
      />
      <div className="rows overflow-hidden rounded-md bg-surface">
        <div className="flex min-h-11 items-center justify-between gap-3 px-4 py-1.5">
          <span className="t-body">Jour</span>
          <div className="w-48">
            <Segmented
              label="Jour"
              options={[
                { value: 'today', label: "Aujourd'hui" },
                { value: 'yesterday', label: 'Hier' },
              ]}
              value={yesterday ? 'yesterday' : 'today'}
              onChange={(v) => setYesterday(v === 'yesterday')}
            />
          </div>
        </div>
        <label className="flex min-h-11 items-center justify-between gap-2 px-4 py-1.5">
          <span className="t-body flex-1">Durée</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_DURATION}
            aria-label="Durée en minutes"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="t-body w-20 bg-transparent text-right tabular-nums outline-none"
          />
          <span className="t-body text-muted">min</span>
        </label>
        {discipline === 'sport' && (
          <label className="flex min-h-11 items-center justify-between gap-2 px-4 py-1.5">
            <span className="t-body">Séance</span>
            <select
              aria-label="Séance"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className="t-body bg-transparent text-right text-sport outline-none"
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {discipline === 'sport' && programs.length === 0 && (
        <p className="t-subhead text-muted">Crée d'abord une séance dans Moi › Modèles de séance › Modèles.</p>
      )}
      <SessionFeedback tone={discipline} flow={flow} desire={desire} note={note} onFlow={setFlow} onDesire={setDesire} onNote={setNote} />
      {error && (
        <p role="alert" className="t-subhead text-danger">
          {error}
        </p>
      )}
      <div className="mt-auto flex flex-col gap-2">
        <Button tone={discipline} disabled={!ready || saving} onClick={save}>
          Enregistrer
        </Button>
        {discipline === 'guitar' && (
          <Button variant="ghost" tone="guitar" onClick={() => navigate('/log/guitare', { replace: true })}>
            Détailler (exos, morceaux)
          </Button>
        )}
      </div>
    </div>
  )
}
